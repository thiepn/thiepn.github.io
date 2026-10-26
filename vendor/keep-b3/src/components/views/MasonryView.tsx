import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Pin,
  Calendar,
  FileQuestion,
  Search,
  X,
  SlidersHorizontal,
  CheckSquare,
  FileText,
  Volume2,
  Palette,
  Bell,
  AlertCircle,
  ArrowUpDown,
  LayoutGrid,
  Grid3X3,
  Columns2,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  GripVertical,
  Filter,
  Folder,
  FolderOpen,
  FolderArchive,
  Check,
} from 'lucide-react';
import { Note, Folder as FolderType, AppSettings, NoteColorKey } from '../../types';
import { NoteCard } from '../NoteCard';
import { MasonryTiltCard } from './MasonryTiltCard';
import { NoteEntranceWrapper } from './NoteEntranceWrapper';
import { groupNotesByMonth } from '../../utils/search';
import { NOTE_COLORS } from '../../utils/colors';
import { a11yAnnouncer } from '../../utils/a11y';

interface MasonryViewProps {
  notes: Note[];
  allNotes: Note[];
  folders: FolderType[];
  settings: AppSettings;
  searchQuery?: string;
  selectedNoteIds?: string[];
  onToggleSelect?: (noteId: string, shiftKey?: boolean) => void;
  onOpenNote: (note: Note) => void;
  onUpdateNote: (note: Note) => void;
  onDeleteNote: (noteId: string) => void;
  onRestoreNote?: (noteId: string) => void;
  onDeleteForever?: (noteId: string) => void;
  onDuplicateNote?: (note: Note) => void;
  onFilterTag?: (tag: string) => void;
  onFilterFolder?: (folderId: string) => void;
  onOpenLinkedNote?: (noteId: string) => void;
  focusedNoteId?: string;
  onSaveAsTemplate?: (note: Note) => void;
  onCompareNote?: (note: Note) => void;
  onReorderNotes?: (reorderedNotes: Note[]) => void | Promise<void>;
}

export type ColumnDensityMode = 'compact' | 'comfortable' | 'wide';
type QuickTypeFilter = 'all' | 'text' | 'checklist' | 'audio' | 'drawing' | 'reminder' | 'pinned' | 'priority';
export type InViewSortOption =
  | 'created_desc'
  | 'updated_desc'
  | 'title_asc'
  | 'custom'
  | 'title_desc'
  | 'created_asc'
  | 'priority_desc'
  | 'default';

const SORT_OPTIONS: Array<{
  id: InViewSortOption;
  label: string;
  description: string;
}> = [
  { id: 'created_desc', label: 'Date Created', description: 'Newest created notes first' },
  { id: 'updated_desc', label: 'Date Updated', description: 'Recently modified notes first' },
  { id: 'title_asc', label: 'Alphabetical', description: 'Title from A to Z' },
  { id: 'custom', label: 'Custom Order', description: 'Preserve custom vault ordering' },
  { id: 'created_asc', label: 'Date Created (Oldest)', description: 'Oldest created notes first' },
  { id: 'title_desc', label: 'Alphabetical (Z → A)', description: 'Title from Z to A' },
  { id: 'priority_desc', label: 'Priority', description: 'Highest priority notes first' },
];

export const MasonryView: React.FC<MasonryViewProps> = ({
  notes,
  allNotes,
  folders,
  settings,
  searchQuery: globalSearchQuery,
  selectedNoteIds = [],
  onToggleSelect,
  onOpenNote,
  onUpdateNote,
  onDeleteNote,
  onRestoreNote,
  onDeleteForever,
  onDuplicateNote,
  onFilterTag,
  onFilterFolder,
  onOpenLinkedNote,
  focusedNoteId,
  onSaveAsTemplate,
  onCompareNote,
  onReorderNotes,
}) => {
  // Container measurement ref for dynamic container-aware layout
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  // Drag-and-drop state for manual card reordering
  const [draggingNoteId, setDraggingNoteId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ noteId: string; position: 'before' | 'after' } | null>(null);

  // Column Density State ('compact' | 'comfortable' | 'wide')
  const [densityMode, setDensityMode] = useState<ColumnDensityMode>(() => {
    try {
      const saved = localStorage.getItem('tinytools_masonry_density');
      if (saved === 'compact' || saved === 'comfortable' || saved === 'wide') {
        return saved;
      }
    } catch {}
    if (settings.compactMode) return 'compact';
    if (settings.cardDensity === 'spacious') return 'wide';
    return (settings.cardDensity as ColumnDensityMode) || 'comfortable';
  });

  // In-view local search & filtering state
  const [inViewSearch, setInViewSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<QuickTypeFilter>('all');
  const [colorFilter, setColorFilter] = useState<NoteColorKey | 'all'>('all');
  const [sortOption, setSortOption] = useState<InViewSortOption>(() => {
    try {
      const saved = localStorage.getItem('tinytools_masonry_sort');
      if (saved && SORT_OPTIONS.some((o) => o.id === saved)) {
        return saved as InViewSortOption;
      }
    } catch {}
    if (settings.sortBy === 'manual') return 'custom';
    return 'created_desc';
  });
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [groupByFolder, setGroupByFolder] = useState(false);
  const [collapsedFolderIds, setCollapsedFolderIds] = useState<Set<string>>(new Set());
  const [customCols, setCustomCols] = useState<string | null>(null);
  const [isPinnedCollapsed, setIsPinnedCollapsed] = useState(false);
  const [isOthersCollapsed, setIsOthersCollapsed] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  useEffect(() => {
    if (settings.sortBy === 'manual' && sortOption !== 'custom') {
      setSortOption('custom');
    }
  }, [settings.sortBy]);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  // Measure container width with ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0) {
        setContainerWidth(Math.round(rect.width));
      }
    };

    measure();

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cr = entry.contentRect;
        if (cr && cr.width > 0) {
          setContainerWidth(Math.round(cr.width));
        }
      }
    });

    resizeObserver.observe(el);
    return () => resizeObserver.disconnect();
  }, []);

  // Update density mode & persist
  const handleSetDensityMode = (mode: ColumnDensityMode) => {
    setDensityMode(mode);
    try {
      localStorage.setItem('tinytools_masonry_density', mode);
    } catch {}
  };

  // Update sort option & persist
  const handleSetSortOption = (opt: InViewSortOption) => {
    setSortOption(opt);
    try {
      localStorage.setItem('tinytools_masonry_sort', opt);
    } catch {}
  };

  // Keyboard shortcut listener: pressing '/' focuses the in-view search when not in another input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click outside to close sort dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target as Node)) {
        setIsSortDropdownOpen(false);
      }
    };
    if (isSortDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isSortDropdownOpen]);

  // Quick lookup folder map
  const folderMap = useMemo(() => {
    const map = new Map<string, string>();
    folders.forEach((f) => map.set(f.id, f.name.toLowerCase()));
    return map;
  }, [folders]);

  // Step 1: Filter notes with in-view query and criteria
  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      // 1. In-View Text Search
      if (inViewSearch.trim()) {
        const q = inViewSearch.toLowerCase().trim();
        const titleMatch = (note.title || '').toLowerCase().includes(q);
        const contentMatch = (note.content || '').toLowerCase().includes(q);
        const tagMatch = (note.tags || []).some((t) => t.toLowerCase().includes(q) || `#${t.toLowerCase()}`.includes(q));
        const checklistMatch =
          Array.isArray(note.checklist) &&
          note.checklist.some((item) => item.text.toLowerCase().includes(q));
        const folderName = note.folderId ? folderMap.get(note.folderId) : '';
        const folderMatch = folderName ? folderName.includes(q) : false;

        if (!titleMatch && !contentMatch && !tagMatch && !checklistMatch && !folderMatch) {
          return false;
        }
      }

      // 2. Type / Attribute Filter
      if (typeFilter === 'text' && note.type !== 'text') return false;
      if (typeFilter === 'checklist' && note.type !== 'checklist') return false;
      if (typeFilter === 'audio' && note.type !== 'audio' && (!note.audios || note.audios.length === 0)) return false;
      if (typeFilter === 'drawing' && note.type !== 'drawing') return false;
      if (typeFilter === 'reminder' && !note.reminderDate) return false;
      if (typeFilter === 'pinned' && !note.pinned) return false;
      if (typeFilter === 'priority' && (!note.priority || note.priority === 'none')) return false;

      // 3. Color Filter
      if (colorFilter !== 'all' && (note.color || 'default') !== colorFilter) {
        return false;
      }

      return true;
    });
  }, [notes, inViewSearch, typeFilter, colorFilter, folderMap]);

  // Step 2: In-View Sorting
  const sortedNotes = useMemo(() => {
    if (sortOption === 'custom') {
      return [...filteredNotes].sort((a, b) => {
        const orderA = typeof a.order === 'number' ? a.order : 999999;
        const orderB = typeof b.order === 'number' ? b.order : 999999;
        if (orderA !== orderB) return orderA - orderB;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }
    if (sortOption === 'default') return filteredNotes;

    const list = [...filteredNotes];
    switch (sortOption) {
      case 'created_desc':
        return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case 'created_asc':
        return list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      case 'updated_desc':
        return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      case 'title_asc':
        return list.sort((a, b) => (a.title || 'Untitled').localeCompare(b.title || 'Untitled'));
      case 'title_desc':
        return list.sort((a, b) => (b.title || 'Untitled').localeCompare(a.title || 'Untitled'));
      case 'priority_desc': {
        const pOrder: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1, none: 0 };
        return list.sort((a, b) => (pOrder[b.priority || 'none'] || 0) - (pOrder[a.priority || 'none'] || 0));
      }
      default:
        return list;
    }
  }, [filteredNotes, sortOption]);

  // Unique key identifying active filters, search criteria, sort, and collection changes.
  // Re-triggers the Tailwind transition entrance animations for visual fluidity.
  const filterKey = useMemo(() => {
    const idsSample = sortedNotes.slice(0, 10).map((n) => n.id).join(',');
    return `${globalSearchQuery || ''}_${inViewSearch}_${typeFilter}_${colorFilter}_${sortOption}_${groupByFolder}_${sortedNotes.length}_${idsSample}`;
  }, [globalSearchQuery, inViewSearch, typeFilter, colorFilter, sortOption, groupByFolder, sortedNotes]);

  // Step 3: Partition into pinned and other notes for regular view
  const pinnedNotes = useMemo(() => sortedNotes.filter((n) => n.pinned && !n.trashed), [sortedNotes]);
  const otherNotes = useMemo(
    () => (pinnedNotes.length > 0 ? sortedNotes.filter((n) => !n.pinned || n.trashed) : sortedNotes),
    [sortedNotes, pinnedNotes.length]
  );

  // Step 4: Group notes by Folder when Group by Folder is active
  const folderGroups = useMemo(() => {
    if (!groupByFolder) return [];

    const folderNotesMap = new Map<string, Note[]>();
    const uncategorizedNotes: Note[] = [];
    const existingFolderIds = new Set(folders.map((f) => f.id));

    sortedNotes.forEach((note) => {
      if (note.folderId && existingFolderIds.has(note.folderId)) {
        if (!folderNotesMap.has(note.folderId)) {
          folderNotesMap.set(note.folderId, []);
        }
        folderNotesMap.get(note.folderId)!.push(note);
      } else {
        uncategorizedNotes.push(note);
      }
    });

    const groups: Array<{
      id: string;
      folder?: FolderType;
      name: string;
      color?: string;
      icon?: string;
      notes: Note[];
      isUncategorized: boolean;
    }> = [];

    // Add folders in their declared order
    folders.forEach((folder) => {
      const matchingNotes = folderNotesMap.get(folder.id);
      if (matchingNotes && matchingNotes.length > 0) {
        groups.push({
          id: folder.id,
          folder,
          name: folder.name,
          color: folder.color,
          icon: folder.icon,
          notes: matchingNotes,
          isUncategorized: false,
        });
      }
    });

    // Add uncategorized notes if any exist
    if (uncategorizedNotes.length > 0) {
      groups.push({
        id: '__uncategorized__',
        name: 'Uncategorized',
        notes: uncategorizedNotes,
        isUncategorized: true,
      });
    }

    return groups;
  }, [groupByFolder, sortedNotes, folders]);

  const toggleFolderCollapse = (folderId: string) => {
    setCollapsedFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  // Month groupings for other notes
  const monthGroups = useMemo(() => {
    if (!settings.showMonthDividers) return null;
    return groupNotesByMonth(otherNotes);
  }, [otherNotes, settings.showMonthDividers]);

  // Dynamic container-aware columns and gap spacing calculation
  const { columnCount, gapClass, gridStyle, cardDensityProp } = useMemo(() => {
    if (customCols && customCols !== 'auto') {
      const cols = parseInt(customCols, 10) || 3;
      const gap = densityMode === 'compact' ? 'gap-2 sm:gap-2.5' : densityMode === 'wide' ? 'gap-4 sm:gap-5 lg:gap-6' : 'gap-3 sm:gap-4';
      const cardProp = densityMode === 'compact' ? 'compact' : densityMode === 'wide' ? 'spacious' : 'comfortable';
      return {
        columnCount: cols,
        gapClass: gap,
        gridStyle: { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` },
        cardDensityProp: cardProp,
      };
    }

    const w = containerWidth > 0 ? containerWidth : (typeof window !== 'undefined' ? window.innerWidth : 1024);

    if (densityMode === 'compact') {
      let cols = 2;
      if (w < 400) cols = 1;
      else if (w < 640) cols = 2;
      else if (w < 920) cols = 3;
      else if (w < 1240) cols = 4;
      else if (w < 1600) cols = 5;
      else cols = 6;

      return {
        columnCount: cols,
        gapClass: 'gap-2 sm:gap-2.5',
        gridStyle: { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` },
        cardDensityProp: 'compact' as const,
      };
    }

    if (densityMode === 'wide') {
      let cols = 1;
      if (w < 680) cols = 1;
      else if (w < 1120) cols = 2;
      else if (w < 1560) cols = 3;
      else cols = 4;

      return {
        columnCount: cols,
        gapClass: 'gap-4 sm:gap-5 lg:gap-6',
        gridStyle: { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` },
        cardDensityProp: 'spacious' as const,
      };
    }

    // Comfortable (default balanced)
    let cols = 1;
    if (w < 520) cols = 1;
    else if (w < 840) cols = 2;
    else if (w < 1220) cols = 3;
    else if (w < 1600) cols = 4;
    else cols = 5;

    return {
      columnCount: cols,
      gapClass: 'gap-3 sm:gap-4',
      gridStyle: { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` },
      cardDensityProp: 'comfortable' as const,
    };
  }, [densityMode, containerWidth, customCols]);

  const gridClass = `grid ${gapClass} items-start`;

  const hasActiveInViewFilters =
    inViewSearch.trim() !== '' ||
    typeFilter !== 'all' ||
    colorFilter !== 'all' ||
    (sortOption !== 'created_desc' && sortOption !== 'default' && sortOption !== 'custom') ||
    groupByFolder;

  const handleClearInViewFilters = () => {
    setInViewSearch('');
    setTypeFilter('all');
    setColorFilter('all');
    handleSetSortOption('created_desc');
    setGroupByFolder(false);
  };

  // Select all filtered notes helper
  const handleSelectAllFiltered = () => {
    if (!onToggleSelect) return;
    const allFilteredIds = sortedNotes.map((n) => n.id);
    const allSelected = allFilteredIds.every((id) => selectedNoteIds.includes(id));
    if (allSelected) {
      allFilteredIds.forEach((id) => {
        if (selectedNoteIds.includes(id)) onToggleSelect(id);
      });
    } else {
      allFilteredIds.forEach((id) => {
        if (!selectedNoteIds.includes(id)) onToggleSelect(id);
      });
    }
  };

  const combinedSearchQuery = [globalSearchQuery, inViewSearch.trim()].filter(Boolean).join(' ');

  // Quick color keys for color filter chips
  const colorSwatchKeys: NoteColorKey[] = ['default', 'red', 'orange', 'yellow', 'green', 'teal', 'blue', 'purple', 'pink'];

  const currentSortConfig = SORT_OPTIONS.find((opt) => opt.id === sortOption) || SORT_OPTIONS[0];

  // Helper to reorder notes list and persist order
  const handleReorder = useCallback(
    (sourceId: string, targetId: string, position: 'before' | 'after') => {
      if (sourceId === targetId) return;

      // Base array is sortedNotes to match exact visual sequence on screen
      const baseList = sortedNotes.length > 0 ? sortedNotes : notes;
      let sourceIndex = baseList.findIndex((n) => n.id === sourceId);
      let targetIndex = baseList.findIndex((n) => n.id === targetId);

      // Fallback to notes if not found in baseList
      if (sourceIndex === -1 || targetIndex === -1) {
        sourceIndex = notes.findIndex((n) => n.id === sourceId);
        targetIndex = notes.findIndex((n) => n.id === targetId);
      }
      if (sourceIndex === -1 || targetIndex === -1) return;

      const targetNote = baseList[targetIndex] || notes[targetIndex];

      // Clone notes list
      const updated = [...(baseList.length > 0 ? baseList : notes)];
      const [movedNote] = updated.splice(sourceIndex, 1);

      // Re-find target index after splice
      let newTargetIndex = updated.findIndex((n) => n.id === targetId);
      if (newTargetIndex === -1) {
        updated.push(movedNote);
        newTargetIndex = updated.length - 1;
      } else {
        if (position === 'after') {
          newTargetIndex += 1;
        }
        updated.splice(newTargetIndex, 0, movedNote);
      }

      // If moving across pinned boundaries, sync pinned status
      if (movedNote.pinned !== targetNote.pinned && !movedNote.trashed) {
        movedNote.pinned = targetNote.pinned;
      }

      // Update explicit order indices across reordered notes
      const withOrder = updated.map((n, idx) => ({
        ...n,
        order: idx,
      }));

      // Switch view sort to custom so manual placement stays active
      if (sortOption !== 'custom') {
        handleSetSortOption('custom');
      }

      a11yAnnouncer.announce(
        `Moved note "${movedNote.title || 'Untitled'}" ${position} "${targetNote.title || 'Untitled'}"`
      );

      onReorderNotes?.(withOrder);
    },
    [sortedNotes, notes, onReorderNotes, sortOption]
  );

  const handleDragStart = (e: React.DragEvent, noteId: string) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('input') ||
      target.closest('textarea') ||
      target.closest('a') ||
      target.closest('.no-drag') ||
      target.isContentEditable
    ) {
      e.preventDefault();
      return;
    }

    if (e.dataTransfer) {
      try {
        e.dataTransfer.setData('text/plain', noteId);
        e.dataTransfer.setData('application/json', JSON.stringify({ noteId }));
        e.dataTransfer.effectAllowed = 'move';
      } catch {}
    }
    setDraggingNoteId(noteId);
  };

  const handleDragOver = (e: React.DragEvent, noteId: string) => {
    if (draggingNoteId === noteId) return;
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height * 0.5;
    const position = e.clientY < midY ? 'before' : 'after';

    setDropTarget({ noteId, position });
  };

  const handleDragLeave = (e: React.DragEvent, noteId: string) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      if (dropTarget?.noteId === noteId) {
        setDropTarget(null);
      }
    }
  };

  const handleDrop = (e: React.DragEvent, targetNoteId: string) => {
    e.preventDefault();
    let sourceId = draggingNoteId || '';

    if (!sourceId && e.dataTransfer) {
      try {
        sourceId = e.dataTransfer.getData('text/plain');
        const jsonStr = e.dataTransfer.getData('application/json');
        if (jsonStr) {
          const parsed = JSON.parse(jsonStr);
          if (parsed.noteId) sourceId = parsed.noteId;
        }
      } catch {}
    }

    if (sourceId && sourceId !== targetNoteId) {
      const position = dropTarget?.position || 'before';
      handleReorder(sourceId, targetNoteId, position);
    }

    setDraggingNoteId(null);
    setDropTarget(null);
  };

  const handleDragEnd = () => {
    setDraggingNoteId(null);
    setDropTarget(null);
  };

  const handleMoveStep = (noteId: string, direction: 'earlier' | 'later', list: Note[]) => {
    const currentIndex = list.findIndex((n) => n.id === noteId);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'earlier' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    const targetNote = list[targetIndex];
    handleReorder(noteId, targetNote.id, direction === 'earlier' ? 'before' : 'after');
  };

  const renderDraggableNoteCard = (note: Note, index: number, list: Note[]) => {
    const isDraggingThis = draggingNoteId === note.id;
    const isDropBefore = dropTarget?.noteId === note.id && dropTarget.position === 'before';
    const isDropAfter = dropTarget?.noteId === note.id && dropTarget.position === 'after';
    const isDropTargetCard = dropTarget?.noteId === note.id;

    return (
      <NoteEntranceWrapper
        key={note.id}
        index={index}
        filterKey={filterKey}
        className="h-full"
      >
        <div
          id={`masonry-draggable-${note.id}`}
          draggable={true}
          onDragStart={(e) => handleDragStart(e, note.id)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => handleDragOver(e, note.id)}
          onDragLeave={(e) => handleDragLeave(e, note.id)}
          onDrop={(e) => handleDrop(e, note.id)}
          className={`relative group/masonry-item transition-all duration-150 h-full ${
            isDraggingThis
              ? 'opacity-35 ring-2 ring-amber-500/70 border-dashed scale-[0.98] shadow-inner'
              : isDropTargetCard
              ? 'ring-2 ring-amber-400 dark:ring-amber-500 shadow-md scale-[1.01]'
              : ''
          }`}
        >
          {/* Drop insertion line - Before */}
          {isDropBefore && (
            <div className="absolute -top-2.5 left-0 right-0 z-30 flex items-center pointer-events-none">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white dark:ring-stone-900 shadow-xs shrink-0" />
              <div className="h-1 bg-amber-500 rounded-full flex-1 mx-1 shadow-xs ring-1 ring-amber-400/50 animate-pulse" />
            </div>
          )}

          {/* Drop insertion line - After */}
          {isDropAfter && (
            <div className="absolute -bottom-2.5 left-0 right-0 z-30 flex items-center pointer-events-none">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white dark:ring-stone-900 shadow-xs shrink-0" />
              <div className="h-1 bg-amber-500 rounded-full flex-1 mx-1 shadow-xs ring-1 ring-amber-400/50 animate-pulse" />
            </div>
          )}

          {/* Drag Handle & Quick Reorder Controls (Accessible non-drag alternative) */}
          <div className="absolute top-2 right-2 z-20 flex items-center gap-0.5 opacity-0 group-hover/masonry-item:opacity-100 focus-within:opacity-100 transition-opacity bg-white/95 dark:bg-stone-900/95 backdrop-blur-md px-1 py-0.5 rounded-lg border border-stone-200/80 dark:border-stone-700/80 shadow-xs pointer-events-auto">
            <div
              id={`masonry-grip-${note.id}`}
              className="cursor-grab active:cursor-grabbing p-1 text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
              title="Drag to reorder card"
              aria-label={`Drag handle for note ${note.title || 'Untitled'}`}
            >
              <GripVertical className="w-3.5 h-3.5" />
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleMoveStep(note.id, 'earlier', list);
              }}
              disabled={index === 0}
              className="p-1 rounded text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 disabled:opacity-20 disabled:pointer-events-none hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              title="Move note earlier"
              aria-label={`Move note ${note.title || 'Untitled'} earlier`}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleMoveStep(note.id, 'later', list);
              }}
              disabled={index === list.length - 1}
              className="p-1 rounded text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 disabled:opacity-20 disabled:pointer-events-none hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              title="Move note later"
              aria-label={`Move note ${note.title || 'Untitled'} later`}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <MasonryTiltCard
            index={index}
            layoutId={note.id}
            isPinned={note.pinned && !note.trashed}
            createdAt={note.createdAt}
            updatedAt={note.updatedAt}
          >
            <NoteCard
              note={note}
              allNotes={allNotes}
              folders={folders}
              searchQuery={combinedSearchQuery}
              isSelected={selectedNoteIds.includes(note.id)}
              onToggleSelect={onToggleSelect}
              isSelectionMode={selectedNoteIds.length > 0}
              onOpenNote={onOpenNote}
              onUpdateNote={onUpdateNote}
              onDeleteNote={onDeleteNote}
              onRestoreNote={onRestoreNote}
              onDeleteForever={onDeleteForever}
              onDuplicateNote={onDuplicateNote}
              onFilterTag={onFilterTag}
              onFilterFolder={onFilterFolder}
              onOpenLinkedNote={onOpenLinkedNote}
              cardDensity={cardDensityProp}
              isFocused={focusedNoteId === note.id}
              onSaveAsTemplate={onSaveAsTemplate}
              onCompareNote={onCompareNote}
            />
          </MasonryTiltCard>
        </div>
      </NoteEntranceWrapper>
    );
  };

  return (
    <div
      ref={containerRef}
      className={`w-full ${densityMode === 'compact' ? 'space-y-3 pb-8' : densityMode === 'wide' ? 'space-y-6 pb-16' : 'space-y-5 pb-12'}`}
    >
      {/* ─────────────────────────────────────────────────────────────
          DEDICATED MASONRY TOOLBAR & IN-VIEW SEARCH
         ───────────────────────────────────────────────────────────── */}
      <div className="w-full bg-white/80 dark:bg-stone-900/80 backdrop-blur-md rounded-2xl border border-stone-200/80 dark:border-stone-800 p-2.5 sm:p-3 shadow-xs space-y-2.5">
        {/* Row 1: Search Input + Result Badge + Quick Layout Controls */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2">
          {/* Dedicated In-View Search Input */}
          <div className="relative flex-1 min-w-[160px]">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={inViewSearch}
              onChange={(e) => setInViewSearch(e.target.value)}
              placeholder="Search & filter cards... (Press /)"
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-stone-100/80 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700/70 rounded-xl text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
            />
            {inViewSearch && (
              <button
                type="button"
                onClick={() => setInViewSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-md transition-colors"
                title="Clear search"
                aria-label="Clear in-view search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Counts and Quick Action Buttons */}
          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-1.5 shrink-0 text-xs">
            <span className="font-mono text-[11px] px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 font-medium">
              {sortedNotes.length} of {notes.length}
            </span>

            {/* Select All Toggle (if select handler provided) */}
            {onToggleSelect && notes.length > 0 && (
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-colors border ${
                  selectedNoteIds.length > 0 && sortedNotes.every((n) => selectedNoteIds.includes(n.id))
                    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-200 dark:hover:bg-stone-750'
                }`}
                title="Select or deselect all displayed notes"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Select View</span>
              </button>
            )}

            {/* Column-Density Toggle ('Compact', 'Comfortable', 'Wide') */}
            <div
              id="masonry-density-toggle"
              role="group"
              aria-label="Column density toggle"
              className="flex items-center p-0.5 bg-stone-100 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700"
            >
              {(
                [
                  { id: 'compact' as const, label: 'Compact', icon: Grid3X3, tip: 'Compact density with narrower columns and tight gaps' },
                  { id: 'comfortable' as const, label: 'Comfortable', icon: LayoutGrid, tip: 'Comfortable balanced columns and standard gaps' },
                  { id: 'wide' as const, label: 'Wide', icon: Columns2, tip: 'Wide density with spacious columns and relaxed gaps' },
                ]
              ).map((mode) => {
                const Icon = mode.icon;
                const isSelected = densityMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => handleSetDensityMode(mode.id)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                      isSelected
                        ? 'bg-amber-500 text-stone-950 font-bold shadow-xs'
                        : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                    }`}
                    title={mode.tip}
                    aria-pressed={isSelected}
                  >
                    <Icon className="w-3 h-3" />
                    <span className="hidden sm:inline">{mode.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Group by Folder Toggle Switch */}
            <button
              id="masonry-group-by-folder-toggle"
              type="button"
              onClick={() => setGroupByFolder(!groupByFolder)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${
                groupByFolder
                  ? 'bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/40 shadow-xs font-bold'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-200 dark:hover:bg-stone-750'
              }`}
              title="Group masonry cards by folder categories"
              aria-label="Group by Folder toggle switch"
              aria-pressed={groupByFolder}
            >
              <Folder className={`w-3.5 h-3.5 ${groupByFolder ? 'text-amber-600 dark:text-amber-400' : 'text-stone-400'}`} />
              <span className="hidden sm:inline">Group by Folder</span>
              <span className="sm:hidden">Folders</span>

              {/* Toggle switch pill */}
              <div
                className={`w-6 h-3.5 rounded-full p-0.5 transition-colors duration-200 ease-in-out flex items-center ml-0.5 ${
                  groupByFolder ? 'bg-amber-500' : 'bg-stone-300 dark:bg-stone-600'
                }`}
              >
                <div
                  className={`w-2.5 h-2.5 rounded-full bg-white shadow-xs transform transition-transform duration-200 ease-in-out ${
                    groupByFolder ? 'translate-x-2.5' : 'translate-x-0'
                  }`}
                />
              </div>
            </button>

            {/* Sort by Dropdown Menu */}
            <div className="relative" ref={sortDropdownRef}>
              <button
                id="masonry-quick-sort-btn"
                type="button"
                onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${
                  sortOption !== 'created_desc' && sortOption !== 'default' && sortOption !== 'custom'
                    ? 'bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/40 font-bold'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-200 dark:hover:bg-stone-750'
                }`}
                title="Sort by: Toggle sorting order (Date Created, Date Updated, Alphabetical, Custom Order)"
                aria-label="Sort by dropdown menu"
                aria-expanded={isSortDropdownOpen}
                aria-haspopup="listbox"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span className="font-medium whitespace-nowrap">
                  <span className="text-stone-400 font-normal hidden lg:inline mr-1">Sort:</span>
                  {currentSortConfig.label}
                </span>
                <ChevronDown className={`w-3 h-3 text-stone-400 transition-transform ${isSortDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu Popup */}
              <AnimatePresence>
                {isSortDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.95 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="absolute right-0 top-full mt-1.5 w-60 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 shadow-xl py-1 z-50 origin-top-right"
                  >
                    <div className="px-3 py-1.5 text-[10px] font-bold text-stone-400 uppercase tracking-wider border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
                      <span>Sort by</span>
                      <ArrowUpDown className="w-3 h-3 text-amber-500" />
                    </div>
                    <div className="p-1 space-y-0.5">
                      {SORT_OPTIONS.map((opt) => {
                        const isSelected = sortOption === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              handleSetSortOption(opt.id);
                              setIsSortDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left ${
                              isSelected
                                ? 'bg-amber-500/15 text-amber-800 dark:text-amber-200 font-bold'
                                : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                            }`}
                          >
                            <div>
                              <div className="font-medium">{opt.label}</div>
                              <div className="text-[10px] text-stone-400 dark:text-stone-500">{opt.description}</div>
                            </div>
                            {isSelected && <Check className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 ml-2" />}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Advanced Filters Toggle */}
            <button
              type="button"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`p-1.5 rounded-lg border transition-colors ${
                showAdvancedFilters || hasActiveInViewFilters
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40 font-bold'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-700 hover:bg-stone-200 dark:hover:bg-stone-750'
              }`}
              title="Toggle filter pills and custom column selectors"
              aria-label="Toggle masonry filter options"
              aria-expanded={showAdvancedFilters}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Row 2: Filter Pills, Color Swatches & Layout Switchers (Always or expandable) */}
        <AnimatePresence>
          {(showAdvancedFilters || hasActiveInViewFilters) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="pt-2 border-t border-stone-200/60 dark:border-stone-800/80 space-y-2 text-xs">
                {/* Filter Pills */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mr-1 flex items-center gap-1">
                    <Filter className="w-3 h-3 text-stone-400" /> Type:
                  </span>
                  {(
                    [
                      { key: 'all' as const, label: 'All Types', icon: undefined },
                      { key: 'text' as const, label: 'Notes', icon: FileText },
                      { key: 'checklist' as const, label: 'Lists', icon: CheckSquare },
                      { key: 'audio' as const, label: 'Audio', icon: Volume2 },
                      { key: 'drawing' as const, label: 'Drawings', icon: Palette },
                      { key: 'reminder' as const, label: 'Reminders', icon: Bell },
                      { key: 'pinned' as const, label: 'Pinned', icon: Pin },
                      { key: 'priority' as const, label: 'Prioritized', icon: AlertCircle },
                    ]
                  ).map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTypeFilter(key)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${
                        typeFilter === key
                          ? 'bg-amber-500 text-stone-950 border-amber-600 shadow-xs'
                          : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-200/70 dark:border-stone-700/60 hover:bg-stone-200 dark:hover:bg-stone-700'
                      }`}
                    >
                      {Icon && <Icon className="w-3 h-3 shrink-0" />}
                      <span>{label}</span>
                    </button>
                  ))}
                </div>

                {/* Colors & Grid Column Selector */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  {/* Color Swatches */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mr-1">Color:</span>
                    <button
                      type="button"
                      onClick={() => setColorFilter('all')}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border transition-all ${
                        colorFilter === 'all'
                          ? 'bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900 border-transparent font-bold'
                          : 'bg-stone-100 dark:bg-stone-800 text-stone-500 border-stone-200 dark:border-stone-700'
                      }`}
                    >
                      All
                    </button>
                    {colorSwatchKeys.map((cKey) => {
                      const cfg = NOTE_COLORS[cKey];
                      const isSelected = colorFilter === cKey;
                      return (
                        <button
                          key={cKey}
                          type="button"
                          onClick={() => setColorFilter(cKey)}
                          className={`w-5 h-5 rounded-full border transition-transform ${
                            isSelected
                              ? 'ring-2 ring-amber-500 ring-offset-1 dark:ring-offset-stone-900 scale-110'
                              : 'opacity-80 hover:opacity-100 hover:scale-105'
                          }`}
                          style={{ backgroundColor: cfg.hex, borderColor: 'rgba(0,0,0,0.15)' }}
                          title={`Filter color: ${cfg.name}`}
                          aria-label={`Filter by ${cfg.name} color`}
                        />
                      );
                    })}
                  </div>

                  {/* Manual Grid Column Selector */}
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mr-1 flex items-center gap-1">
                      <LayoutGrid className="w-3 h-3 text-stone-400" /> Manual Override:
                    </span>
                    {['auto', '2', '3', '4', '5'].map((cols) => (
                      <button
                        key={cols}
                        type="button"
                        onClick={() => setCustomCols(cols === 'auto' ? null : cols)}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold transition-all border ${
                          (customCols === null && cols === 'auto') || customCols === cols
                            ? 'bg-amber-500 text-stone-950 border-amber-600'
                            : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-700 hover:bg-stone-200 dark:hover:bg-stone-700'
                        }`}
                      >
                        {cols === 'auto' ? `Auto (${columnCount}c)` : `${cols}c`}
                      </button>
                    ))}

                    {/* Reset Filters if active */}
                    {hasActiveInViewFilters && (
                      <button
                        type="button"
                        onClick={handleClearInViewFilters}
                        className="ml-2 px-2 py-0.5 rounded-md text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 hover:bg-rose-100 transition-colors"
                      >
                        Reset Filters
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          EMPTY STATE (No notes or no matches)
         ───────────────────────────────────────────────────────────── */}
      {sortedNotes.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col items-center justify-center py-16 text-stone-400 bg-white/40 dark:bg-stone-900/40 rounded-2xl border border-dashed border-stone-200 dark:border-stone-800 p-8"
        >
          <FileQuestion className="w-12 h-12 stroke-[1.25] mb-3 text-stone-300 dark:text-stone-700" />
          <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">
            No notes match your in-view criteria
          </p>
          {inViewSearch && (
            <p className="text-xs text-stone-400 mt-1">
              Matching query: &ldquo;<span className="text-amber-600 dark:text-amber-400 font-mono">{inViewSearch}</span>&rdquo;
            </p>
          )}
          {hasActiveInViewFilters && (
            <button
              type="button"
              onClick={handleClearInViewFilters}
              className="mt-4 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs transition-colors shadow-xs"
            >
              Clear in-view filters
            </button>
          )}
        </motion.div>
      ) : groupByFolder ? (
        /* ─────────────────────────────────────────────────────────────
            GROUPED BY FOLDER SECTIONS
           ───────────────────────────────────────────────────────────── */
        <motion.div layout className={densityMode === 'compact' ? 'space-y-4' : 'space-y-8'}>
          {/* Global Folder Summary & Expand/Collapse All */}
          <div className="flex items-center justify-between px-1 text-xs text-stone-500 dark:text-stone-400">
            <div className="flex items-center gap-1.5 font-semibold text-stone-700 dark:text-stone-300">
              <FolderOpen className="w-4 h-4 text-amber-500" />
              <span>
                {folderGroups.length} Folder {folderGroups.length === 1 ? 'Category' : 'Categories'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                if (collapsedFolderIds.size === folderGroups.length) {
                  setCollapsedFolderIds(new Set());
                } else {
                  setCollapsedFolderIds(new Set(folderGroups.map((g) => g.id)));
                }
              }}
              className="text-[11px] font-medium text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:underline transition-colors"
            >
              {collapsedFolderIds.size === folderGroups.length ? 'Expand All Folders' : 'Collapse All Folders'}
            </button>
          </div>

          {folderGroups.map((group) => {
            const isCollapsed = collapsedFolderIds.has(group.id);
            return (
              <motion.section
                layout
                key={group.id}
                id={`folder-group-${group.id}`}
                className={`${densityMode === 'compact' ? 'space-y-1.5' : 'space-y-3'} scroll-mt-24`}
              >
                {/* Folder Header Banner */}
                <div className="sticky top-16 z-10 py-1.5 bg-white/80 dark:bg-stone-900/80 backdrop-blur-md flex items-center justify-between border-b border-stone-200/70 dark:border-stone-800/70 px-2.5 rounded-xl shadow-xs">
                  <button
                    type="button"
                    onClick={() => toggleFolderCollapse(group.id)}
                    className="flex items-center gap-2 text-xs font-bold text-stone-800 dark:text-stone-200 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="w-4 h-4 text-stone-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-stone-400" />
                    )}
                    {group.isUncategorized ? (
                      <FolderArchive className="w-4 h-4 text-stone-400" />
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <Folder className="w-4 h-4 text-amber-500" />
                        {group.color && (
                          <span
                            className="w-2.5 h-2.5 rounded-full inline-block border border-black/10"
                            style={{ backgroundColor: group.color }}
                          />
                        )}
                      </div>
                    )}
                    <span className="tracking-tight text-sm font-bold">{group.name}</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {!group.isUncategorized && onFilterFolder && (
                      <button
                        type="button"
                        onClick={() => onFilterFolder(group.id)}
                        className="hidden sm:inline-flex text-[11px] font-medium text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                        title={`Focus filter on ${group.name} folder`}
                      >
                        Filter Folder
                      </button>
                    )}
                    <span className="text-[11px] font-mono font-medium text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded-full border border-stone-200/60 dark:border-stone-700/60">
                      {group.notes.length} {group.notes.length === 1 ? 'note' : 'notes'}
                    </span>
                  </div>
                </div>

                {/* Cards Grid inside Folder */}
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.div
                      layout
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className={gridClass}
                      style={gridStyle}
                    >
                      <AnimatePresence mode="popLayout">
                        {group.notes.map((note, index) =>
                          renderDraggableNoteCard(note, index, group.notes)
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.section>
            );
          })}
        </motion.div>
      ) : (
        <motion.div layout className="space-y-6">
          {/* ─────────────────────────────────────────────────────────────
              1. PINNED SECTION (Collapsible)
             ───────────────────────────────────────────────────────────── */}
          {pinnedNotes.length > 0 && (
            <motion.section layout className={densityMode === 'compact' ? 'space-y-1.5' : 'space-y-3'}>
              <div className="flex items-center justify-between px-1">
                <button
                  type="button"
                  onClick={() => setIsPinnedCollapsed(!isPinnedCollapsed)}
                  className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 transition-colors"
                >
                  {isPinnedCollapsed ? (
                    <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
                  )}
                  <Pin className="w-3.5 h-3.5 text-amber-500" />
                  <span>Pinned</span>
                  <span className="text-[11px] font-mono">({pinnedNotes.length})</span>
                </button>
              </div>

              <AnimatePresence>
                {!isPinnedCollapsed && (
                  <motion.div
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className={gridClass}
                    style={gridStyle}
                  >
                    <AnimatePresence mode="popLayout">
                      {pinnedNotes.map((note, index) =>
                        renderDraggableNoteCard(note, index, pinnedNotes)
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.section>
          )}

          {/* ─────────────────────────────────────────────────────────────
              2. OTHERS SECTION (WITH OPTIONAL MONTH DIVIDERS)
             ───────────────────────────────────────────────────────────── */}
          {pinnedNotes.length > 0 && otherNotes.length > 0 && (
            <div className="flex items-center justify-between px-1 pt-2">
              <button
                type="button"
                onClick={() => setIsOthersCollapsed(!isOthersCollapsed)}
                className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 transition-colors"
              >
                {isOthersCollapsed ? (
                  <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
                )}
                <span>Others</span>
                <span className="text-[11px] font-mono">({otherNotes.length})</span>
              </button>
            </div>
          )}

          <AnimatePresence>
            {!isOthersCollapsed && (
              <motion.div
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                {settings.showMonthDividers && monthGroups ? (
                  /* Render with Month Dividers */
                  <div className={densityMode === 'compact' ? 'space-y-4' : 'space-y-8'}>
                    {monthGroups.map((group) => (
                      <motion.section
                        layout
                        key={group.key}
                        id={`month-anchor-${group.key}`}
                        className={`${densityMode === 'compact' ? 'space-y-1.5' : 'space-y-3'} scroll-mt-24`}
                      >
                        <div className="sticky top-16 z-10 py-1.5 bg-white/70 dark:bg-stone-900/70 backdrop-blur-md flex items-center justify-between border-b border-stone-200/60 dark:border-stone-800/60 px-2 rounded-xl">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-amber-500" />
                            <h4 className="text-xs font-bold text-stone-800 dark:text-stone-200 tracking-tight">
                              {group.label}
                            </h4>
                          </div>
                          <span className="text-[11px] font-mono text-stone-500 bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded-full">
                            {group.notes.length} {group.notes.length === 1 ? 'note' : 'notes'}
                          </span>
                        </div>

                        <div className={gridClass} style={gridStyle}>
                          <AnimatePresence mode="popLayout">
                            {group.notes.map((note, index) =>
                              renderDraggableNoteCard(note, index, group.notes)
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.section>
                    ))}
                  </div>
                ) : (
                  /* Regular Flat Masonry Grid */
                  <div className={gridClass} style={gridStyle}>
                    <AnimatePresence mode="popLayout">
                      {otherNotes.map((note, index) =>
                        renderDraggableNoteCard(note, index, otherNotes)
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
};
