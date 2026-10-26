import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  X,
  SlidersHorizontal,
  CheckSquare,
  FileText,
  Bell,
  Image as ImageIcon,
  Link2,
  Folder as FolderIcon,
  FolderX,
  RotateCcw,
  Sparkles,
  Clock,
  Pin,
  Shuffle,
  Tag,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Check,
  Palette,
  Dices,
} from 'lucide-react';
import { FilterState, Folder, Note, NoteColorKey } from '../types';
import { NOTE_COLORS, COLOR_KEYS } from '../utils/colors';
import { a11yAnnouncer } from '../utils/a11y';

interface QuickFilterBarProps {
  filter: FilterState;
  folders: Folder[];
  onFilterChange: (updater: (prev: FilterState) => FilterState) => void;
  notes?: Note[];
  totalFilteredCount?: number;
  filteredNotesCount?: number;
  totalNotesCount?: number;
  allTags?: string[];
  onOpenRandomNote?: () => void;
  onOpenIdeaSpark?: () => void;
  onEmptyTrash?: () => void;
  sortBy?: 'updatedAt' | 'createdAt' | 'title' | 'reminder';
  sortOrder?: 'asc' | 'desc';
  onSortChange?: (sortBy: 'updatedAt' | 'createdAt' | 'title' | 'reminder', sortOrder: 'asc' | 'desc') => void;
}

export const QuickFilterBar: React.FC<QuickFilterBarProps> = ({
  filter,
  folders,
  onFilterChange,
  notes,
  totalFilteredCount,
  filteredNotesCount,
  totalNotesCount,
  allTags,
  onOpenRandomNote,
  onOpenIdeaSpark,
  onEmptyTrash,
  sortBy: externalSortBy,
  sortOrder: externalSortOrder,
  onSortChange,
}) => {
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [hoveredColor, setHoveredColor] = useState<NoteColorKey | null>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setShowSortMenu(false);
      }
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setShowColorPicker(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowSortMenu(false);
        setShowColorPicker(false);
      }
    };
    if (showSortMenu || showColorPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [showSortMenu, showColorPicker]);

  const displayCount = typeof filteredNotesCount === 'number' ? filteredNotesCount : (totalFilteredCount ?? 0);

  const safeFilter = filter || {
    searchQuery: '',
    selectedFolderId: null,
    selectedTag: null,
    selectedColor: null,
    selectedType: 'all',
    scope: 'active',
    viewMode: 'masonry',
  };

  const activeSortBy = externalSortBy || safeFilter.sortBy || 'updatedAt';
  const activeSortOrder = externalSortOrder || safeFilter.sortOrder || 'desc';

  const handleApplySort = (newSortBy: 'updatedAt' | 'createdAt' | 'title' | 'reminder', newSortOrder?: 'asc' | 'desc') => {
    const nextOrder = newSortOrder || (activeSortBy === newSortBy ? (activeSortOrder === 'asc' ? 'desc' : 'asc') : 'desc');
    if (onSortChange) {
      onSortChange(newSortBy, nextOrder);
    }
    onFilterChange((p) => ({
      ...p,
      sortBy: newSortBy,
      sortOrder: nextOrder,
    }));
    setShowSortMenu(false);
  };

  const toggleSortOrderOnly = () => {
    const flipped = activeSortOrder === 'asc' ? 'desc' : 'asc';
    if (onSortChange) {
      onSortChange(activeSortBy, flipped);
    }
    onFilterChange((p) => ({
      ...p,
      sortOrder: flipped,
    }));
  };

  const getSortLabel = () => {
    switch (activeSortBy) {
      case 'createdAt':
        return 'Date Created';
      case 'title':
        return 'Title';
      case 'reminder':
        return 'Reminder';
      case 'updatedAt':
      default:
        return 'Date Modified';
    }
  };

  const activeFolder = folders.find((f) => f.id === safeFilter.selectedFolderId);

  const hasAnyFilter = Boolean(
    safeFilter.searchQuery ||
      safeFilter.selectedTag ||
      safeFilter.selectedColor ||
      safeFilter.selectedFolderId ||
      safeFilter.selectedMonth ||
      safeFilter.selectedType !== 'all' ||
      safeFilter.hasReminderOnly ||
      safeFilter.hasImagesOnly ||
      safeFilter.hasLinksOnly ||
      safeFilter.pinnedOnly ||
      safeFilter.viewMode === 'recent'
  );

  const clearAllFilters = () => {
    onFilterChange((prev) => ({
      ...prev,
      searchQuery: '',
      selectedFolderId: null,
      selectedTag: null,
      selectedColor: null,
      selectedMonth: null,
      selectedType: 'all',
      hasReminderOnly: false,
      hasImagesOnly: false,
      hasLinksOnly: false,
      pinnedOnly: false,
      viewMode: prev.viewMode === 'recent' ? 'masonry' : prev.viewMode,
    }));
  };

  const colorCounts = useMemo(() => {
    const counts: Record<NoteColorKey, number> = {
      default: 0,
      red: 0,
      rose: 0,
      orange: 0,
      amber: 0,
      yellow: 0,
      lime: 0,
      green: 0,
      emerald: 0,
      teal: 0,
      cyan: 0,
      blue: 0,
      indigo: 0,
      violet: 0,
      purple: 0,
      fuchsia: 0,
      pink: 0,
      brown: 0,
      slate: 0,
      gray: 0,
    };
    if (!notes || notes.length === 0) return counts;
    for (const n of notes) {
      if (n.trashed) {
        if (safeFilter.scope === 'trash') {
          const c = n.color || 'default';
          counts[c] = (counts[c] || 0) + 1;
        }
        continue;
      }
      if (safeFilter.scope === 'trash') continue;
      if (safeFilter.scope === 'archived' && !n.archived) continue;
      if (safeFilter.scope !== 'archived' && n.archived) continue;
      const c = n.color || 'default';
      counts[c] = (counts[c] || 0) + 1;
    }
    return counts;
  }, [notes, safeFilter.scope]);

  const totalNotesInScope = useMemo(() => {
    return (Object.values(colorCounts) as number[]).reduce((acc: number, count: number) => acc + (count || 0), 0);
  }, [colorCounts]);

  const colorsInUse = useMemo(() => {
    return COLOR_KEYS.filter((ck) => (colorCounts[ck] || 0) > 0).sort(
      (a, b) => (colorCounts[b] || 0) - (colorCounts[a] || 0)
    );
  }, [colorCounts]);

  const handleSelectColor = (colorKey: NoteColorKey | null) => {
    onFilterChange((prev) => {
      const nextColor = prev.selectedColor === colorKey ? null : colorKey;
      if (nextColor) {
        a11yAnnouncer.announce(`Filtered by note color: ${NOTE_COLORS[nextColor]?.name || nextColor}`);
      } else {
        a11yAnnouncer.announce('Cleared color filter');
      }
      return {
        ...prev,
        selectedColor: nextColor,
      };
    });
    setShowColorPicker(false);
  };

  const getSectionTitle = () => {
    if (safeFilter.viewMode === 'recent') return 'Recent Notes (Top 20)';
    if (safeFilter.scope === 'trash') return 'Trash';
    if (safeFilter.scope === 'archived') return 'Archive';
    if (safeFilter.scope === 'reminders') return 'Reminders';
    if (safeFilter.selectedFolderId === 'unorganized') return 'Unorganized Notes';
    if (activeFolder) return activeFolder.name;
    if (safeFilter.selectedTag) return `#${safeFilter.selectedTag}`;
    if (safeFilter.selectedMonth) {
      const [year, month] = safeFilter.selectedMonth.split('-');
      const d = new Date(parseInt(year), parseInt(month) - 1, 1);
      return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    }
    return 'All Notes';
  };

  return (
    <div className="w-full flex flex-wrap items-center justify-between gap-3 py-2 px-1 text-xs">
      {/* Title & Item Counter */}
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-bold text-stone-950 dark:text-white flex items-center gap-2 tracking-tight">
          {getSectionTitle()}
          <span className="text-xs px-2 py-0.5 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-mono font-bold">
            {displayCount} {displayCount === 1 ? 'note' : 'notes'}
          </span>
        </h2>
      </div>

      {/* Quick Type & Attribute Pill Filters */}
      <div className="flex items-center flex-wrap gap-1.5">
        {/* Recent View Mode Filter Button */}
        <button
          onClick={() =>
            onFilterChange((p) => ({
              ...p,
              viewMode: p.viewMode === 'recent' ? 'masonry' : 'recent',
            }))
          }
          className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
            safeFilter.viewMode === 'recent'
              ? 'bg-amber-500 border-amber-600 text-stone-950 shadow-xs'
              : 'bg-white dark:bg-stone-900 border-stone-300 dark:border-stone-700 text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800'
          }`}
          title="Recent: Top 20 most recently edited notes"
        >
          <Clock className="w-3.5 h-3.5 stroke-[2.25]" /> Recent
        </button>

        {/* Type selector */}
        <button
          onClick={() =>
            onFilterChange((p) => ({
              ...p,
              selectedType:
                p.selectedType === 'all'
                  ? 'checklist'
                  : p.selectedType === 'checklist'
                  ? 'text'
                  : 'all',
            }))
          }
          className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
            safeFilter.selectedType !== 'all'
              ? 'bg-amber-100 dark:bg-amber-950 border-amber-400 dark:border-amber-700 text-amber-950 dark:text-amber-200'
              : 'bg-white dark:bg-stone-900 border-stone-300 dark:border-stone-700 text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800'
          }`}
        >
          {safeFilter.selectedType === 'checklist' ? (
            <>
              <CheckSquare className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 stroke-[2.25]" /> Checklists Only
            </>
          ) : safeFilter.selectedType === 'text' ? (
            <>
              <FileText className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 stroke-[2.25]" /> Text Only
            </>
          ) : (
            <>
              <SlidersHorizontal className="w-3.5 h-3.5 text-stone-600 dark:text-stone-400" /> All Types
            </>
          )}
        </button>

        {/* Reminders Toggle */}
        <button
          onClick={() =>
            onFilterChange((p) => ({
              ...p,
              hasReminderOnly: !p.hasReminderOnly,
            }))
          }
          className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
            safeFilter.hasReminderOnly
              ? 'bg-sky-100 dark:bg-sky-950 border-sky-400 dark:border-sky-700 text-sky-950 dark:text-sky-200'
              : 'bg-white dark:bg-stone-900 border-stone-300 dark:border-stone-700 text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800'
          }`}
        >
          <Bell className="w-3.5 h-3.5 stroke-[2.25]" /> Reminders
        </button>

        {/* Linked notes toggle */}
        <button
          onClick={() =>
            onFilterChange((p) => ({
              ...p,
              hasLinksOnly: !p.hasLinksOnly,
            }))
          }
          className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
            safeFilter.hasLinksOnly
              ? 'bg-indigo-100 dark:bg-indigo-950 border-indigo-400 dark:border-indigo-700 text-indigo-950 dark:text-indigo-200'
              : 'bg-white dark:bg-stone-900 border-stone-300 dark:border-stone-700 text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800'
          }`}
        >
          <Link2 className="w-3.5 h-3.5 stroke-[2.25]" /> Linked Notes
        </button>

        {/* Has Images toggle */}
        <button
          onClick={() =>
            onFilterChange((p) => ({
              ...p,
              hasImagesOnly: !p.hasImagesOnly,
            }))
          }
          className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
            safeFilter.hasImagesOnly
              ? 'bg-emerald-100 dark:bg-emerald-950 border-emerald-400 dark:border-emerald-700 text-emerald-950 dark:text-emerald-200'
              : 'bg-white dark:bg-stone-900 border-stone-300 dark:border-stone-700 text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5 stroke-[2.25]" /> Images
        </button>

        {/* Pinned notes toggle */}
        <button
          onClick={() =>
            onFilterChange((p) => ({
              ...p,
              pinnedOnly: !p.pinnedOnly,
            }))
          }
          className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
            safeFilter.pinnedOnly
              ? 'bg-amber-100 dark:bg-amber-950 border-amber-400 dark:border-amber-700 text-amber-950 dark:text-amber-200'
              : 'bg-white dark:bg-stone-900 border-stone-300 dark:border-stone-700 text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800'
          }`}
          title="Show pinned notes only"
        >
          <Pin className="w-3.5 h-3.5 stroke-[2.25]" /> Pinned
        </button>

        {/* Unorganized Notes Toggle (No Folder) */}
        <button
          onClick={() =>
            onFilterChange((p) => ({
              ...p,
              selectedFolderId: p.selectedFolderId === 'unorganized' ? null : 'unorganized',
            }))
          }
          className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
            safeFilter.selectedFolderId === 'unorganized'
              ? 'bg-amber-500 border-amber-600 text-stone-950 shadow-xs'
              : 'bg-white dark:bg-stone-900 border-stone-300 dark:border-stone-700 text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800'
          }`}
          title="Filter notes with no folder assigned (Inbox Zero)"
        >
          <FolderX className="w-3.5 h-3.5 stroke-[2.25]" /> Unorganized
        </button>

        {/* Untagged Notes Toggle (No Tags) */}
        <button
          onClick={() =>
            onFilterChange((p) => ({
              ...p,
              selectedTag: p.selectedTag === '__untagged__' ? null : '__untagged__',
            }))
          }
          className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
            safeFilter.selectedTag === '__untagged__'
              ? 'bg-amber-500 border-amber-600 text-stone-950 shadow-xs'
              : 'bg-white dark:bg-stone-900 border-stone-300 dark:border-stone-700 text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800'
          }`}
          title="Filter notes without any tags"
        >
          <Tag className="w-3.5 h-3.5 stroke-[2.25]" /> Untagged
        </button>

        {/* Visual Color Picker Filter */}
        <div className="relative" ref={colorPickerRef}>
          <button
            type="button"
            onClick={() => setShowColorPicker(!showColorPicker)}
            aria-haspopup="true"
            aria-expanded={showColorPicker}
            className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              safeFilter.selectedColor
                ? 'bg-amber-100 dark:bg-amber-950 border-amber-400 dark:border-amber-700 text-amber-950 dark:text-amber-200'
                : 'bg-white dark:bg-stone-900 border-stone-300 dark:border-stone-700 text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
            title={
              safeFilter.selectedColor
                ? `Color filter: ${NOTE_COLORS[safeFilter.selectedColor]?.name || safeFilter.selectedColor} (${colorCounts[safeFilter.selectedColor] || 0} notes). Click to change or clear.`
                : 'Filter notes by color'
            }
          >
            {safeFilter.selectedColor ? (
              <>
                <span
                  className="w-3 h-3 rounded-full border border-stone-400 dark:border-stone-500 shrink-0 shadow-2xs"
                  style={{ backgroundColor: NOTE_COLORS[safeFilter.selectedColor]?.hex }}
                />
                <span className="truncate max-w-[85px] sm:max-w-none">
                  {NOTE_COLORS[safeFilter.selectedColor]?.name || safeFilter.selectedColor}
                </span>
                <span className="text-[11px] font-mono font-bold text-amber-950 dark:text-amber-300">
                  ({colorCounts[safeFilter.selectedColor] || 0})
                </span>
              </>
            ) : (
              <>
                <Palette className="w-3.5 h-3.5 text-stone-600 dark:text-stone-400 stroke-[2.25]" />
                <span>Color</span>
              </>
            )}
          </button>

          {showColorPicker && (
            <div
              role="dialog"
              aria-label="Filter notes by color"
              className="absolute left-0 sm:left-auto sm:right-0 top-full mt-1.5 w-80 max-w-[calc(100vw-2rem)] p-3 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-xl shadow-xl z-50 text-xs space-y-2.5 animate-in fade-in zoom-in-95 duration-100"
            >
              <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-2">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-amber-500" /> Filter by Color
                  </span>
                  <p className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">
                    {colorsInUse.length} {colorsInUse.length === 1 ? 'color' : 'colors'} in use · {totalNotesInScope} total {totalNotesInScope === 1 ? 'note' : 'notes'}
                  </p>
                </div>
                {safeFilter.selectedColor && (
                  <button
                    type="button"
                    onClick={() => handleSelectColor(null)}
                    className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:underline"
                  >
                    Clear Filter
                  </button>
                )}
              </div>

              {/* Color Options List with Counts and Distribution Bars */}
              <div className="max-h-64 overflow-y-auto space-y-1 pr-1 focus:outline-none">
                {/* Colors with notes first, sorted by frequency */}
                {colorsInUse.length > 0 && (
                  <div className="space-y-1">
                    {colorsInUse.map((ck) => {
                      const cfg = NOTE_COLORS[ck];
                      const isSelected = safeFilter.selectedColor === ck;
                      const count = colorCounts[ck] || 0;
                      const pct = totalNotesInScope > 0 ? Math.round((count / totalNotesInScope) * 100) : 0;
                      return (
                        <button
                          key={ck}
                          type="button"
                          onClick={() => handleSelectColor(ck)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-left transition-all ${
                            isSelected
                              ? 'bg-amber-100 dark:bg-amber-950/70 border-amber-400 dark:border-amber-700 text-amber-950 dark:text-amber-200 font-bold shadow-2xs'
                              : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/60 text-stone-800 dark:text-stone-200'
                          }`}
                          title={`${cfg.name}: ${count} notes (${pct}%)`}
                          aria-label={`Filter by ${cfg.name}, ${count} notes`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-stone-300 dark:border-stone-600 shrink-0 shadow-2xs"
                              style={{ backgroundColor: cfg.hex }}
                            />
                            <span className="truncate text-xs">{cfg.name}</span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {/* Distribution Progress Bar */}
                            <div className="w-16 h-1.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden hidden sm:block">
                              <div
                                className="h-full rounded-full transition-all duration-300"
                                style={{
                                  width: `${Math.max(pct, 4)}%`,
                                  backgroundColor: cfg.hex === '#ffffff' ? '#94a3b8' : cfg.hex,
                                }}
                              />
                            </div>
                            <span className="text-[11px] font-mono font-bold text-stone-700 dark:text-stone-300 min-w-[28px] text-right">
                              {count}
                            </span>
                            {isSelected && (
                              <Check className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 stroke-[2.5]" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Other colors with 0 notes */}
                {COLOR_KEYS.filter((ck) => (colorCounts[ck] || 0) === 0).length > 0 && (
                  <div className="pt-1.5 border-t border-stone-200 dark:border-stone-800">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 px-1 pb-1">
                      Unused Colors (0 notes)
                    </p>
                    <div className="grid grid-cols-5 gap-1.5">
                      {COLOR_KEYS.filter((ck) => (colorCounts[ck] || 0) === 0).map((ck) => {
                        const cfg = NOTE_COLORS[ck];
                        const isSelected = safeFilter.selectedColor === ck;
                        return (
                          <button
                            key={ck}
                            type="button"
                            onClick={() => handleSelectColor(ck)}
                            className={`h-8 rounded-lg flex flex-col items-center justify-center transition-all relative border ${
                              isSelected
                                ? 'ring-2 ring-amber-500 border-amber-600'
                                : 'border-stone-200 dark:border-stone-700 opacity-60 hover:opacity-100 hover:border-stone-400'
                            }`}
                            style={{ backgroundColor: cfg.hex }}
                            title={`${cfg.name} (0 notes)`}
                            aria-label={`Filter by ${cfg.name}, 0 notes`}
                          >
                            <span className="text-[9px] font-mono font-bold text-stone-900 leading-none">
                              0
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="pt-2 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between text-[11px]">
                <span className="text-stone-500 dark:text-stone-400">
                  {safeFilter.selectedColor
                    ? `Active: ${NOTE_COLORS[safeFilter.selectedColor]?.name} (${colorCounts[safeFilter.selectedColor] || 0} notes)`
                    : 'Select a color to filter notes'}
                </span>
                {safeFilter.selectedColor && (
                  <button
                    type="button"
                    onClick={() => handleSelectColor(null)}
                    className="font-semibold text-stone-700 hover:text-stone-950 dark:text-stone-300 dark:hover:text-white"
                  >
                    Show All
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Quick Sort Dropdown Menu */}
        <div className="relative" ref={sortMenuRef}>
          <div className="inline-flex items-center rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 overflow-hidden shadow-2xs">
            <button
              type="button"
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="px-2.5 py-1 text-xs font-semibold text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-1.5 transition-colors"
              title="Sort Notes"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-amber-500 stroke-[2.25]" />
              <span>{getSortLabel()}</span>
            </button>
            <button
              type="button"
              onClick={toggleSortOrderOnly}
              className="px-2 py-1 border-l border-stone-200 dark:border-stone-700 text-xs font-mono font-bold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-amber-500 transition-colors"
              title={`Order: ${activeSortOrder === 'asc' ? 'Ascending (A-Z, Oldest)' : 'Descending (Z-A, Newest)'}. Click to reverse.`}
            >
              {activeSortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {showSortMenu && (
            <div className="absolute right-0 top-full mt-1.5 w-48 p-1.5 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-xl shadow-xl z-50 text-xs space-y-1 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                Sort Notes By
              </div>
              {[
                { id: 'updatedAt', label: 'Date Modified' },
                { id: 'createdAt', label: 'Date Created' },
                { id: 'title', label: 'Title (Alphabetical)' },
                { id: 'reminder', label: 'Reminder Date' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleApplySort(item.id as any)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between ${
                    activeSortBy === item.id
                      ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-950 dark:text-amber-200 font-bold'
                      : 'hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  <span>{item.label}</span>
                  {activeSortBy === item.id && <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                </button>
              ))}

              <div className="border-t border-stone-200 dark:border-stone-700 my-1 pt-1">
                <button
                  type="button"
                  onClick={() => handleApplySort(activeSortBy, 'desc')}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between ${
                    activeSortOrder === 'desc'
                      ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-950 dark:text-amber-200 font-bold'
                      : 'hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  <span className="flex items-center gap-1.5"><ArrowDown className="w-3.5 h-3.5" /> Descending (Newest / Z-A)</span>
                  {activeSortOrder === 'desc' && <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                </button>
                <button
                  type="button"
                  onClick={() => handleApplySort(activeSortBy, 'asc')}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between ${
                    activeSortOrder === 'asc'
                      ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-950 dark:text-amber-200 font-bold'
                      : 'hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  <span className="flex items-center gap-1.5"><ArrowUp className="w-3.5 h-3.5" /> Ascending (Oldest / A-Z)</span>
                  {activeSortOrder === 'asc' && <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Serendipity / Random Note Button */}
        {onOpenRandomNote && (
          <button
            onClick={onOpenRandomNote}
            className="px-2.5 py-1 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Open a random note (Alt+R)"
          >
            <Shuffle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 stroke-[2.25]" /> Random Note
          </button>
        )}

        {/* Mind Sparks / Idea Combinator Button */}
        {onOpenIdeaSpark && (
          <button
            onClick={onOpenIdeaSpark}
            className="px-2.5 py-1 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Collide random notes for creative brainstorming sparks"
          >
            <Dices className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 stroke-[2.25]" /> Idea Spark
          </button>
        )}

        {/* Dismissable Active Tags/Colors */}
        {safeFilter.selectedFolderId === 'unorganized' && (
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-amber-400 dark:border-amber-700 bg-amber-100 dark:bg-amber-950 text-amber-950 dark:text-amber-200 text-xs font-semibold">
            <FolderX className="w-3 h-3" />
            <span>Unorganized Notes</span>
            <button
              onClick={() => onFilterChange((p) => ({ ...p, selectedFolderId: null }))}
              className="hover:text-rose-600 ml-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {safeFilter.selectedTag === '__untagged__' && (
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-amber-400 dark:border-amber-700 bg-amber-100 dark:bg-amber-950 text-amber-950 dark:text-amber-200 text-xs font-semibold">
            <Tag className="w-3 h-3" />
            <span>Untagged Notes</span>
            <button
              onClick={() => onFilterChange((p) => ({ ...p, selectedTag: null }))}
              className="hover:text-rose-600 ml-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Dismissable Active Tags/Colors */}
        {safeFilter.pinnedOnly && (
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-amber-400 dark:border-amber-700 bg-amber-100 dark:bg-amber-950 text-amber-950 dark:text-amber-200 text-xs font-semibold">
            <Pin className="w-3 h-3" />
            <span>Pinned Only</span>
            <button
              onClick={() => onFilterChange((p) => ({ ...p, pinnedOnly: false }))}
              className="hover:text-rose-600 ml-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {safeFilter.selectedColor && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-amber-400 dark:border-amber-700 bg-amber-100 dark:bg-amber-950 text-amber-950 dark:text-amber-200 text-xs font-semibold">
            <span
              className="w-2.5 h-2.5 rounded-full border border-stone-400 dark:border-stone-500"
              style={{ backgroundColor: NOTE_COLORS[safeFilter.selectedColor]?.hex }}
            />
            <span>
              {NOTE_COLORS[safeFilter.selectedColor]?.name || safeFilter.selectedColor}
              <span className="font-mono ml-1 font-bold">
                ({colorCounts[safeFilter.selectedColor] || 0})
              </span>
            </span>
            <button
              onClick={() => {
                onFilterChange((p) => ({ ...p, selectedColor: null }));
                a11yAnnouncer.announce('Cleared color filter');
              }}
              className="hover:text-rose-600 ml-0.5"
              aria-label={`Remove ${NOTE_COLORS[safeFilter.selectedColor]?.name || safeFilter.selectedColor} color filter`}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {safeFilter.selectedTag && (
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-amber-400 dark:border-amber-700 bg-amber-100 dark:bg-amber-950 text-amber-950 dark:text-amber-200 text-xs font-semibold">
            <span>#{safeFilter.selectedTag}</span>
            <button
              onClick={() => onFilterChange((p) => ({ ...p, selectedTag: null }))}
              className="hover:text-rose-600"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {safeFilter.selectedMonth && (
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-amber-400 dark:border-amber-700 bg-amber-100 dark:bg-amber-950 text-amber-950 dark:text-amber-200 text-xs font-semibold">
            <span>Month: {safeFilter.selectedMonth}</span>
            <button
              onClick={() => onFilterChange((p) => ({ ...p, selectedMonth: null }))}
              className="hover:text-rose-600"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Empty Trash Button in Trash Scope */}
        {safeFilter.scope === 'trash' && displayCount > 0 && onEmptyTrash && (
          <button
            onClick={onEmptyTrash}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-rose-700 hover:text-rose-900 dark:text-rose-400 dark:hover:text-rose-200 font-semibold text-xs bg-rose-100/70 dark:bg-rose-950/50 hover:bg-rose-200 dark:hover:bg-rose-900/60 transition-colors border border-rose-300 dark:border-rose-800"
            title="Permanently remove all notes in trash"
          >
            <Trash2 className="w-3 h-3" /> Empty Trash
          </button>
        )}

        {/* Clear All Reset Button */}
        {hasAnyFilter && (
          <button
            onClick={clearAllFilters}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-stone-700 hover:text-stone-950 dark:text-stone-300 dark:hover:text-white font-semibold text-xs hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors border border-stone-300 dark:border-stone-700"
            title="Clear all filters"
          >
            <RotateCcw className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* Horizontal Quick Color Filter Scroller with Note Counts */}
      {colorsInUse.length > 0 && (
        <div className="w-full flex items-center gap-1.5 pt-1 overflow-x-auto no-scrollbar py-0.5">
          <span className="text-[11px] font-semibold text-stone-600 dark:text-stone-400 shrink-0 flex items-center gap-1">
            <Palette className="w-3 h-3 text-amber-500" /> Colors:
          </span>
          {colorsInUse.map((colorKey) => {
            const cfg = NOTE_COLORS[colorKey];
            const count = colorCounts[colorKey] || 0;
            const isSelected = safeFilter.selectedColor === colorKey;
            return (
              <button
                key={colorKey}
                onClick={() => handleSelectColor(colorKey)}
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium shrink-0 transition-colors border ${
                  isSelected
                    ? 'bg-amber-500 text-stone-950 border-amber-600 font-bold shadow-xs'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-200 dark:hover:bg-stone-700'
                }`}
                title={`Filter by ${cfg.name}: ${count} ${count === 1 ? 'note' : 'notes'}`}
                aria-label={`Filter by ${cfg.name}, ${count} notes`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full border border-stone-400 shrink-0"
                  style={{ backgroundColor: cfg.hex }}
                />
                <span>{cfg.name.split(' ')[0]}</span>
                <span className="text-[10px] font-mono font-bold opacity-80">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Horizontal Quick Tag Filter Scroller */}
      {allTags && allTags.length > 0 && (
        <div className="flex items-center gap-1.5 pt-1 overflow-x-auto no-scrollbar py-0.5">
          <span className="text-[11px] font-semibold text-stone-600 dark:text-stone-400 shrink-0 flex items-center gap-1">
            <Tag className="w-3 h-3 text-amber-500" /> Tags:
          </span>
          {allTags.map((tag) => {
            const cleanTag = tag.replace(/^#/, '');
            const isSelected = safeFilter.selectedTag?.toLowerCase() === cleanTag.toLowerCase();
            return (
              <button
                key={cleanTag}
                onClick={() =>
                  onFilterChange((p) => ({
                    ...p,
                    selectedTag: isSelected ? null : cleanTag,
                  }))
                }
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium shrink-0 transition-colors border ${
                  isSelected
                    ? 'bg-amber-500 text-stone-950 border-amber-600 font-bold shadow-xs'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-200 dark:hover:bg-stone-700'
                }`}
                title={`Filter by #${cleanTag}`}
              >
                #{cleanTag}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
