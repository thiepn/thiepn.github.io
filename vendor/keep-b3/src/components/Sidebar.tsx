import React, { useState, useEffect, useMemo } from 'react';
import {
  StickyNote,
  Bell,
  Star,
  Pin,
  Folder as FolderIcon,
  Plus,
  Tag,
  Palette,
  Archive,
  Trash2,
  Bookmark,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Hash,
  Clock,
  Sparkles,
  BookOpen,
  X,
  Activity,
  Search,
  Command,
  Calendar,
  Zap,
  HardDrive,
  ShieldCheck,
  ListTodo,
  GitMerge,
  Brain,
  Globe,
  UploadCloud,
  Layers,
  LayoutDashboard,
  Users,
  Target,
  FolderKanban,
  Compass,
  GraduationCap,
  Landmark,
  Heart,
  Package,
  Scale,
  Inbox,
  SlidersHorizontal,
  Share2,
  LayoutTemplate,
  Flame,
  Dices,
  Grid2X2,
  Columns,
  Timer,
  Boxes,
  Hourglass,
  Mic,
  Network,
  Presentation,
  Calculator,
} from 'lucide-react';
import { Note, Folder, SavedSearch, FilterState, NoteColorKey } from '../types';
import { NOTE_COLORS, COLOR_KEYS } from '../utils/colors';
import { getAllUniqueTags, getAllUniqueColors, groupNotesByMonth } from '../utils/search';
import { universalInboxService } from '../pkm/inbox';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  folders: Folder[];
  savedSearches: SavedSearch[];
  filter: FilterState;
  onFilterChange: (updater: (prev: FilterState) => FilterState) => void;
  onOpenManageFolders: () => void;
  onOpenManageTags?: () => void;
  onOpenSaveSearchModal: (query: string) => void;
  onOpenSearch?: () => void;
  onOpenCommandPalette?: () => void;
  onOpenDailyNote?: () => void;
  onOpenQuickCapture?: () => void;
  onOpenSmartViews?: () => void;
  onOpenPDFReader?: () => void;
  onOpenCanvas?: () => void;
  onOpenMedia?: () => void;
  onOpenReferences?: () => void;
  onOpenAutomations?: () => void;
  onOpenCalendar?: () => void;
  onOpenAgenda?: () => void;
  onOpenTimeline?: () => void;
  onOpenReview?: () => void;
  onOpenCollections?: () => void;
  onOpenDashboards?: () => void;
  onOpenPeople?: () => void;
  onOpenPlanningHome?: () => void;
  onOpenGoalsProjects?: () => void;
  onOpenRoutines?: () => void;
  onOpenLearning?: () => void;
  onOpenLibrary?: () => void;
  onOpenFinance?: () => void;
  onOpenHealth?: () => void;
  onOpenTravel?: () => void;
  onOpenAssets?: () => void;
  onOpenDecisions?: () => void;
  onOpenUniversalInbox?: () => void;
  onOpenPublishing?: () => void;
  onOpenExportCenter?: () => void;
  onOpenMigrationHub?: () => void;
  onOpenVaultDoctor?: () => void;
  onOpenRecoveryCenter?: () => void;
  onOpenPersonalization?: () => void;
  onOpenTemplates?: () => void;
  onOpenVaultTasks?: (perspective?: any) => void;
  onOpenNoteCompare?: (noteAId?: string) => void;
  onOpenSerendipity?: () => void;
  onOpenThemeCreator?: () => void;
  onOpenWritingSprint?: () => void;
  onOpenIdeaSpark?: () => void;
  onOpenThoughtMatrix?: () => void;
  onOpenCornellNotes?: () => void;
  onOpenPomodoroFlow?: () => void;
  onOpenZettelkasten?: () => void;
  onOpenChronoCapsule?: () => void;
  onOpenSynthesisMatrix?: () => void;
  onOpenVoiceMemoStudio?: () => void;
  onOpenMindMapStudio?: () => void;
  onOpenMacroAutomation?: () => void;
  onOpenVaultStats?: () => void;
  onOpenFlashcards?: () => void;
  onOpenPresentationStudio?: () => void;
  onOpenReactiveSandbox?: () => void;
  onDeleteSavedSearch: (id: string) => void;
  onEmptyTrash: () => void;
  compactMode?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  notes = [],
  folders = [],
  savedSearches = [],
  filter,
  onFilterChange,
  onOpenManageFolders,
  onOpenManageTags,
  onOpenSaveSearchModal,
  onOpenSearch,
  onOpenCommandPalette,
  onOpenDailyNote,
  onOpenQuickCapture,
  onOpenSmartViews,
  onOpenPDFReader,
  onOpenCanvas,
  onOpenMedia,
  onOpenReferences,
  onOpenAutomations,
  onOpenCalendar,
  onOpenAgenda,
  onOpenTimeline,
  onOpenReview,
  onOpenCollections,
  onOpenDashboards,
  onOpenPeople,
  onOpenPlanningHome,
  onOpenGoalsProjects,
  onOpenRoutines,
  onOpenLearning,
  onOpenLibrary,
  onOpenFinance,
  onOpenHealth,
  onOpenTravel,
  onOpenAssets,
  onOpenDecisions,
  onOpenUniversalInbox,
  onOpenPublishing,
  onOpenExportCenter,
  onOpenMigrationHub,
  onOpenVaultDoctor,
  onOpenRecoveryCenter,
  onOpenPersonalization,
  onOpenTemplates,
  onOpenVaultTasks,
  onOpenNoteCompare,
  onOpenSerendipity,
  onOpenThemeCreator,
  onOpenWritingSprint,
  onOpenIdeaSpark,
  onOpenThoughtMatrix,
  onOpenCornellNotes,
  onOpenPomodoroFlow,
  onOpenZettelkasten,
  onOpenChronoCapsule,
  onOpenSynthesisMatrix,
  onOpenVoiceMemoStudio,
  onOpenMindMapStudio,
  onOpenMacroAutomation,
  onOpenVaultStats,
  onOpenFlashcards,
  onOpenPresentationStudio,
  onOpenReactiveSandbox,
  onDeleteSavedSearch,
  onEmptyTrash,
  compactMode = false,
}) => {
  const safeFilter: FilterState = filter || {
    searchQuery: '',
    selectedFolderId: null,
    selectedTag: null,
    selectedColor: null,
    selectedType: 'all',
    scope: 'active',
    viewMode: 'masonry',
  };

  const safeNotes = Array.isArray(notes) ? notes : [];
  const safeFolders = Array.isArray(folders) ? folders : [];
  const safeSavedSearches = Array.isArray(savedSearches) ? savedSearches : [];

  const [foldersOpen, setFoldersOpen] = useState(true);
  const [tagsOpen, setTagsOpen] = useState(true);
  const [colorsOpen, setColorsOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(true);
  const [savedSearchesOpen, setSavedSearchesOpen] = useState(true);
  const [knowledgeOpen, setKnowledgeOpen] = useState(true);
  const [planningOpen, setPlanningOpen] = useState(false);
  const [vaultToolsOpen, setVaultToolsOpen] = useState(false);

  // Counts calculations memoized
  const activeNotes = useMemo(() => safeNotes.filter((n) => !n.trashed && !n.archived), [safeNotes]);
  const favoriteCount = useMemo(() => safeNotes.filter((n) => !n.trashed && n.isFavorite).length, [safeNotes]);
  const pinnedCount = useMemo(() => activeNotes.filter((n) => n.pinned).length, [activeNotes]);
  const reminderCount = useMemo(() => activeNotes.filter((n) => Boolean(n.reminderDate)).length, [activeNotes]);
  const archiveCount = useMemo(() => safeNotes.filter((n) => n.archived && !n.trashed).length, [safeNotes]);
  const trashCount = useMemo(() => safeNotes.filter((n) => n.trashed).length, [safeNotes]);

  // Open action items count across all active notes
  const openTasksCount = useMemo(() => {
    let count = 0;
    for (const n of safeNotes) {
      if (!n || n.trashed) continue;
      if (n.type === 'checklist' && n.checklist) {
        count += n.checklist.filter((i) => !i.completed).length;
      } else if (n.content) {
        const matches = n.content.match(/^\s*[-*+]\s+\[ \]/gm);
        if (matches) count += matches.length;
      }
    }
    return count;
  }, [safeNotes]);

  const [inboxCount, setInboxCount] = useState(() => universalInboxService.getUnprocessedCount());
  useEffect(() => {
    return universalInboxService.subscribe(() => {
      setInboxCount(universalInboxService.getUnprocessedCount());
    });
  }, []);

  const uniqueTags = useMemo(() => getAllUniqueTags(safeNotes), [safeNotes]);
  const uniqueColors = useMemo(() => getAllUniqueColors(safeNotes), [safeNotes]);
  const monthGroups = useMemo(() => groupNotesByMonth(activeNotes), [activeNotes]);

  const folderCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const n of activeNotes) {
      if (n.folderId) {
        map.set(n.folderId, (map.get(n.folderId) || 0) + 1);
      }
    }
    return map;
  }, [activeNotes]);

  const getFolderNoteCount = (folderId: string) => {
    return folderCountMap.get(folderId) || 0;
  };

  const setScope = (scope: FilterState['scope']) => {
    onFilterChange((prev) => ({
      ...(prev || safeFilter),
      scope,
      selectedFolderId: null,
      selectedTag: null,
      selectedColor: null,
      selectedMonth: null,
    }));
    if (window.innerWidth < 1024) onClose();
  };

  const selectFolder = (folderId: string | null) => {
    onFilterChange((prev) => ({
      ...(prev || safeFilter),
      scope: 'active',
      selectedFolderId: folderId,
      selectedTag: null,
      selectedColor: null,
      selectedMonth: null,
    }));
    if (window.innerWidth < 1024) onClose();
  };

  const selectTag = (tag: string) => {
    onFilterChange((prev) => {
      const isAlready = (prev?.selectedTag || safeFilter.selectedTag) === tag;
      return {
        ...(prev || safeFilter),
        scope: 'active',
        selectedTag: isAlready ? null : tag,
      };
    });
    if (window.innerWidth < 1024) onClose();
  };

  const selectColor = (color: NoteColorKey) => {
    onFilterChange((prev) => {
      const isAlready = (prev?.selectedColor || safeFilter.selectedColor) === color;
      return {
        ...(prev || safeFilter),
        selectedColor: isAlready ? null : color,
      };
    });
    if (window.innerWidth < 1024) onClose();
  };

  const selectMonth = (monthKey: string) => {
    onFilterChange((prev) => ({
      ...(prev || safeFilter),
      selectedMonth: (prev?.selectedMonth || safeFilter.selectedMonth) === monthKey ? null : monthKey,
    }));
    if (window.innerWidth < 1024) onClose();
  };

  // Keyboard Escape listener when mobile drawer is open
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const padBtn = compactMode
    ? 'px-2.5 py-1.5 rounded-lg text-xs min-h-[32px]'
    : 'px-3 py-2 rounded-xl text-sm min-h-[40px]';
  const padSubBtn = compactMode
    ? 'px-2.5 py-1.5 rounded-lg text-xs min-h-[30px]'
    : 'px-3 py-2 rounded-xl text-sm';
  const padHeader = compactMode
    ? 'px-2 py-1 text-[11px]'
    : 'px-2 py-1.5 text-xs';
  const padItem = compactMode
    ? 'px-2 py-1 rounded-lg text-xs'
    : 'px-2.5 py-1.5 rounded-lg text-xs';

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          aria-hidden="true"
          className="fixed inset-0 top-16 bg-stone-900/50 backdrop-blur-xs z-30 lg:hidden transition-opacity"
        />
      )}

      <aside
        id="app-sidebar"
        role="navigation"
        aria-label="Vault Navigation and Filters"
        className={`
          fixed lg:static top-16 bottom-0 left-0 z-40
          bg-[#f7f6f3] dark:bg-[#131316] border-r border-stone-200 dark:border-stone-800
          flex flex-col justify-between shrink-0
          transition-all duration-200 ease-in-out
          ${
            isOpen
              ? 'translate-x-0 w-72 opacity-100 shadow-xl lg:shadow-none'
              : '-translate-x-full lg:translate-x-0 lg:w-0 lg:opacity-0 lg:overflow-hidden lg:border-r-0'
          }
        `}
      >
        <div className="w-72 h-full flex flex-col justify-between overflow-hidden">
          {/* Mobile Header / Close Button */}
          <div className="lg:hidden flex items-center justify-between px-4 py-2.5 border-b border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">Navigation</span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 min-w-[36px] min-h-[36px] flex items-center justify-center"
              title="Close sidebar (Escape)"
              aria-label="Close sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className={`flex-1 overflow-y-auto text-sm ${compactMode ? 'px-2.5 py-2.5 space-y-3.5' : 'px-3 py-4 space-y-6'}`}>
          {/* Main Navigation Links */}
          <div className={compactMode ? 'space-y-0.5' : 'space-y-1'}>
            <button
              id="nav-all-notes"
              onClick={() => {
                setScope('active');
                if (window.innerWidth < 1024) onClose();
              }}
              className={`w-full flex items-center justify-between ${padBtn} text-left font-semibold transition-colors ${
                safeFilter.scope === 'active' &&
                !safeFilter.selectedFolderId &&
                !safeFilter.selectedTag &&
                !safeFilter.selectedColor &&
                !safeFilter.selectedMonth
                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-950 dark:text-amber-200 border border-amber-300/60 dark:border-amber-800/60'
                  : 'text-stone-900 dark:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <StickyNote className="w-4 h-4 text-amber-600 dark:text-amber-400 stroke-[2.25] shrink-0" />
                <span className="truncate">Notes</span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-mono font-bold shrink-0 ml-2">
                {activeNotes.length}
              </span>
            </button>

            <button
              id="nav-favorites"
              onClick={() => setScope('favorites')}
              className={`w-full flex items-center justify-between ${padBtn} text-left font-semibold transition-colors ${
                safeFilter.scope === 'favorites'
                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-950 dark:text-amber-200 border border-amber-300/60 dark:border-amber-800/60'
                  : 'text-stone-900 dark:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500/20 stroke-[2.25] shrink-0" />
                <span className="truncate">Favorites</span>
              </div>
              {favoriteCount > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-950 text-amber-950 dark:text-amber-200 font-mono font-bold shrink-0 ml-2">
                  {favoriteCount}
                </span>
              )}
            </button>

            <button
              id="nav-reminders"
              onClick={() => setScope('reminders')}
              className={`w-full flex items-center justify-between ${padBtn} text-left font-semibold transition-colors ${
                safeFilter.scope === 'reminders'
                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-950 dark:text-amber-200 border border-amber-300/60 dark:border-amber-800/60'
                  : 'text-stone-900 dark:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Bell className="w-4 h-4 text-sky-600 dark:text-sky-400 stroke-[2.25] shrink-0" />
                <span className="truncate">Reminders</span>
              </div>
              {reminderCount > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-sky-200 dark:bg-sky-950 text-sky-950 dark:text-sky-200 font-mono font-bold shrink-0 ml-2">
                  {reminderCount}
                </span>
              )}
            </button>

            {onOpenDailyNote && (
              <button
                id="nav-daily-note"
                onClick={onOpenDailyNote}
                className={`w-full flex items-center justify-between ${padSubBtn} text-left font-semibold text-stone-900 dark:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400 stroke-[2.25] shrink-0" />
                  <span className="truncate">Daily Note</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400 shrink-0 ml-2">
                  Alt+D
                </span>
              </button>
            )}

            {onOpenVaultTasks && (
              <button
                id="nav-vault-tasks"
                onClick={() => {
                  onOpenVaultTasks();
                  if (window.innerWidth < 1024) onClose();
                }}
                className={`w-full flex items-center justify-between ${padSubBtn} text-left font-semibold text-stone-900 dark:text-stone-100 hover:bg-emerald-100/60 dark:hover:bg-emerald-950/40 hover:text-emerald-800 dark:hover:text-emerald-300 transition-colors`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <ListTodo className="w-4 h-4 text-emerald-600 dark:text-emerald-400 stroke-[2.25] shrink-0" />
                  <span className="truncate">Vault Tasks & Action Items</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  {openTasksCount > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono font-bold">
                      {openTasksCount}
                    </span>
                  )}
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                    Ctrl+Alt+T
                  </span>
                </div>
              </button>
            )}

            {onOpenNoteCompare && (
              <button
                id="nav-note-compare"
                onClick={() => {
                  onOpenNoteCompare();
                  if (window.innerWidth < 1024) onClose();
                }}
                className={`w-full flex items-center justify-between ${padSubBtn} text-left font-semibold text-stone-900 dark:text-stone-100 hover:bg-indigo-100/60 dark:hover:bg-indigo-950/40 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <GitMerge className="w-4 h-4 text-indigo-600 dark:text-indigo-400 stroke-[2.25] shrink-0" />
                  <span className="truncate">Compare & Merge</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                  Ctrl+Alt+M
                </span>
              </button>
            )}

            <button
              id="nav-zen-focus-dock"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('keepnotes_restore_zen_dock'));
                if (window.innerWidth < 1024) onClose();
              }}
              className={`w-full flex items-center justify-between ${padSubBtn} text-left font-semibold text-stone-900 dark:text-stone-100 hover:bg-amber-100/60 dark:hover:bg-amber-950/40 hover:text-amber-800 dark:hover:text-amber-300 transition-colors`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Sparkles className="w-4 h-4 text-amber-500 stroke-[2.25] shrink-0" />
                <span className="truncate">Zen Focus Dock</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                Ctrl+Alt+Z
              </span>
            </button>

            {onOpenSerendipity && (
              <button
                id="nav-serendipity"
                onClick={() => {
                  onOpenSerendipity();
                  if (window.innerWidth < 1024) onClose();
                }}
                className={`w-full flex items-center justify-between ${padSubBtn} text-left font-semibold text-stone-900 dark:text-stone-100 hover:bg-amber-100/60 dark:hover:bg-amber-950/40 hover:text-amber-800 dark:hover:text-amber-300 transition-colors`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Compass className="w-4 h-4 text-amber-500 stroke-[2.25] shrink-0" />
                  <span className="truncate">Serendipity Oracle</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                  Alt+R
                </span>
              </button>
            )}

            {onOpenThemeCreator && (
              <button
                id="nav-theme-creator"
                onClick={() => {
                  onOpenThemeCreator();
                  if (window.innerWidth < 1024) onClose();
                }}
                className={`w-full flex items-center justify-between ${padSubBtn} text-left font-semibold text-stone-900 dark:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Palette className="w-4 h-4 text-purple-500 stroke-[2.25] shrink-0" />
                  <span className="truncate">Theme Studio & Palette</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                  Alt+T
                </span>
              </button>
            )}

            {onOpenWritingSprint && (
              <button
                id="nav-writing-sprint"
                onClick={() => {
                  onOpenWritingSprint();
                  if (window.innerWidth < 1024) onClose();
                }}
                className={`w-full flex items-center justify-between ${padSubBtn} text-left font-semibold text-stone-900 dark:text-stone-100 hover:bg-amber-100/60 dark:hover:bg-amber-950/40 hover:text-amber-800 dark:hover:text-amber-300 transition-colors`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Flame className="w-4 h-4 text-amber-500 stroke-[2.25] shrink-0" />
                  <span className="truncate">Writing Sprint Arena</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                  Alt+W
                </span>
              </button>
            )}

            {onOpenIdeaSpark && (
              <button
                id="nav-idea-spark"
                onClick={() => {
                  onOpenIdeaSpark();
                  if (window.innerWidth < 1024) onClose();
                }}
                className={`w-full flex items-center justify-between ${padSubBtn} text-left font-semibold text-stone-900 dark:text-stone-100 hover:bg-amber-100/60 dark:hover:bg-amber-950/40 hover:text-amber-800 dark:hover:text-amber-300 transition-colors`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Dices className="w-4 h-4 text-amber-500 stroke-[2.25] shrink-0" />
                  <span className="truncate">Idea Spark Combinator</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                  Alt+I
                </span>
              </button>
            )}

            {onOpenThoughtMatrix && (
              <button
                id="nav-thought-matrix"
                onClick={() => {
                  onOpenThoughtMatrix();
                  if (window.innerWidth < 1024) onClose();
                }}
                className={`w-full flex items-center justify-between ${padSubBtn} text-left font-semibold text-stone-900 dark:text-stone-100 hover:bg-indigo-100/60 dark:hover:bg-indigo-950/40 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Grid2X2 className="w-4 h-4 text-indigo-500 stroke-[2.25] shrink-0" />
                  <span className="truncate">Thought Matrix (2×2)</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                  Alt+M
                </span>
              </button>
            )}

            {onOpenCornellNotes && (
              <button
                id="nav-cornell-notes"
                onClick={() => {
                  onOpenCornellNotes();
                  if (window.innerWidth < 1024) onClose();
                }}
                className={`w-full flex items-center justify-between ${padSubBtn} text-left font-semibold text-stone-900 dark:text-stone-100 hover:bg-violet-100/60 dark:hover:bg-violet-950/40 hover:text-violet-800 dark:hover:text-violet-300 transition-colors`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Columns className="w-4 h-4 text-violet-500 stroke-[2.25] shrink-0" />
                  <span className="truncate">Cornell Notes & Recall</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                  Alt+C
                </span>
              </button>
            )}

            {onOpenPomodoroFlow && (
              <button
                id="nav-pomodoro-flow"
                onClick={() => {
                  onOpenPomodoroFlow();
                  if (window.innerWidth < 1024) onClose();
                }}
                className={`w-full flex items-center justify-between ${padSubBtn} text-left font-semibold text-stone-900 dark:text-stone-100 hover:bg-rose-100/60 dark:hover:bg-rose-950/40 hover:text-rose-800 dark:hover:text-rose-300 transition-colors`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Timer className="w-4 h-4 text-rose-500 stroke-[2.25] shrink-0" />
                  <span className="truncate">Pomodoro & Flow (P1)</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                  Alt+P
                </span>
              </button>
            )}

            {onOpenZettelkasten && (
              <button
                id="nav-zettelkasten-studio"
                onClick={() => {
                  onOpenZettelkasten();
                  if (window.innerWidth < 1024) onClose();
                }}
                className={`w-full flex items-center justify-between ${padSubBtn} text-left font-semibold text-stone-900 dark:text-stone-100 hover:bg-amber-100/60 dark:hover:bg-amber-950/40 hover:text-amber-800 dark:hover:text-amber-300 transition-colors`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Boxes className="w-4 h-4 text-amber-500 stroke-[2.25] shrink-0" />
                  <span className="truncate">Zettelkasten Studio (P2)</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                  Alt+Z
                </span>
              </button>
            )}

            {onOpenChronoCapsule && (
              <button
                id="nav-chrono-capsule"
                onClick={() => {
                  onOpenChronoCapsule();
                  if (window.innerWidth < 1024) onClose();
                }}
                className={`w-full flex items-center justify-between ${padSubBtn} text-left font-semibold text-stone-900 dark:text-stone-100 hover:bg-indigo-100/60 dark:hover:bg-indigo-950/40 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Hourglass className="w-4 h-4 text-indigo-500 stroke-[2.25] shrink-0" />
                  <span className="truncate">Chrono Capsule (P3)</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                  Alt+K
                </span>
              </button>
            )}

            {onOpenSynthesisMatrix && (
              <button
                id="nav-synthesis-matrix"
                onClick={() => {
                  onOpenSynthesisMatrix();
                  if (window.innerWidth < 1024) onClose();
                }}
                className={`w-full flex items-center justify-between ${padSubBtn} text-left font-semibold text-stone-900 dark:text-stone-100 hover:bg-teal-100/60 dark:hover:bg-teal-950/40 hover:text-teal-800 dark:hover:text-teal-300 transition-colors`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Scale className="w-4 h-4 text-teal-500 stroke-[2.25] shrink-0" />
                  <span className="truncate">Synthesis Matrix (P4)</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                  Alt+X
                </span>
              </button>
            )}

            {onOpenVoiceMemoStudio && (
              <button
                id="nav-voice-memo-studio"
                onClick={() => {
                  onOpenVoiceMemoStudio();
                  if (window.innerWidth < 1024) onClose();
                }}
                className={`w-full flex items-center justify-between ${padSubBtn} text-left font-semibold text-stone-900 dark:text-stone-100 hover:bg-rose-100/60 dark:hover:bg-rose-950/40 hover:text-rose-800 dark:hover:text-rose-300 transition-colors`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Mic className="w-4 h-4 text-rose-500 stroke-[2.25] shrink-0" />
                  <span className="truncate">Voice Memo Studio (P5)</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                  Alt+V
                </span>
              </button>
            )}

            {onOpenMindMapStudio && (
              <button
                id="nav-mind-map-studio"
                onClick={() => {
                  onOpenMindMapStudio();
                  if (window.innerWidth < 1024) onClose();
                }}
                className={`w-full flex items-center justify-between ${padSubBtn} text-left font-semibold text-stone-900 dark:text-stone-100 hover:bg-cyan-100/60 dark:hover:bg-cyan-950/40 hover:text-cyan-800 dark:hover:text-cyan-300 transition-colors`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Network className="w-4 h-4 text-cyan-500 stroke-[2.25] shrink-0" />
                  <span className="truncate">Visual Mind Map (P6)</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                  Alt+B
                </span>
              </button>
            )}

            {onOpenMacroAutomation && (
              <button
                id="nav-macro-automation"
                onClick={() => {
                  onOpenMacroAutomation();
                  if (window.innerWidth < 1024) onClose();
                }}
                className={`w-full flex items-center justify-between ${padSubBtn} text-left font-semibold text-stone-900 dark:text-stone-100 hover:bg-amber-100/60 dark:hover:bg-amber-950/40 hover:text-amber-800 dark:hover:text-amber-300 transition-colors`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Zap className="w-4 h-4 text-amber-500 stroke-[2.25] shrink-0" />
                  <span className="truncate">Macro Engine (P7)</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                  Alt+Y
                </span>
              </button>
            )}

            {onOpenVaultStats && (
              <button
                id="nav-vault-stats"
                onClick={() => {
                  onOpenVaultStats();
                  if (window.innerWidth < 1024) onClose();
                }}
                className={`w-full flex items-center justify-between ${padSubBtn} text-left font-semibold text-stone-900 dark:text-stone-100 hover:bg-amber-100/60 dark:hover:bg-amber-950/40 hover:text-amber-800 dark:hover:text-amber-300 transition-colors`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Activity className="w-4 h-4 text-amber-500 stroke-[2.25] shrink-0" />
                  <span className="truncate">Vault Statistics & 52W</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                  Alt+H
                </span>
              </button>
            )}

            {onOpenFlashcards && (
              <button
                id="nav-flashcards"
                onClick={() => {
                  onOpenFlashcards();
                  if (window.innerWidth < 1024) onClose();
                }}
                className={`w-full flex items-center justify-between ${padSubBtn} text-left font-semibold text-stone-900 dark:text-stone-100 hover:bg-amber-100/60 dark:hover:bg-amber-950/40 hover:text-amber-800 dark:hover:text-amber-300 transition-colors`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <GraduationCap className="w-4 h-4 text-amber-500 stroke-[2.25] shrink-0" />
                  <span className="truncate">Flashcard Studio (P8)</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                  Alt+F
                </span>
              </button>
            )}

            {onOpenPresentationStudio && (
              <button
                id="nav-presentation-studio"
                onClick={() => {
                  onOpenPresentationStudio();
                  if (window.innerWidth < 1024) onClose();
                }}
                className={`w-full flex items-center justify-between ${padSubBtn} text-left font-semibold text-stone-900 dark:text-stone-100 hover:bg-purple-100/60 dark:hover:bg-purple-950/40 hover:text-purple-800 dark:hover:text-purple-300 transition-colors`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Presentation className="w-4 h-4 text-purple-500 stroke-[2.25] shrink-0" />
                  <span className="truncate">Slide Deck Studio (P9)</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                  Alt+G
                </span>
              </button>
            )}

            {onOpenReactiveSandbox && (
              <button
                id="nav-reactive-sandbox"
                onClick={() => {
                  onOpenReactiveSandbox();
                  if (window.innerWidth < 1024) onClose();
                }}
                className={`w-full flex items-center justify-between ${padSubBtn} text-left font-semibold text-stone-900 dark:text-stone-100 hover:bg-cyan-100/60 dark:hover:bg-cyan-950/40 hover:text-cyan-800 dark:hover:text-cyan-300 transition-colors`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Calculator className="w-4 h-4 text-cyan-500 stroke-[2.25] shrink-0" />
                  <span className="truncate">Reactive Sandbox (P10)</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                  Alt+Q
                </span>
              </button>
            )}

            {onOpenUniversalInbox && (
              <button
                id="nav-universal-inbox"
                onClick={onOpenUniversalInbox}
                className={`w-full flex items-center justify-between ${padSubBtn} text-left font-semibold text-stone-900 dark:text-stone-100 hover:bg-amber-100/60 dark:hover:bg-amber-950/40 hover:text-amber-700 dark:hover:text-amber-300 transition-colors`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Inbox className="w-4 h-4 text-amber-600 dark:text-amber-400 stroke-[2.25] shrink-0" />
                  <span className="truncate">Universal Inbox</span>
                </div>
                {inboxCount > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500 text-white shadow-xs shrink-0 ml-2">
                    {inboxCount}
                  </span>
                )}
              </button>
            )}

            {onOpenQuickCapture && (
              <button
                id="nav-quick-capture"
                onClick={onOpenQuickCapture}
                className={`w-full flex items-center justify-between ${padSubBtn} text-left font-semibold text-stone-900 dark:text-stone-100 hover:bg-amber-100/60 dark:hover:bg-amber-950/40 hover:text-amber-700 dark:hover:text-amber-300 transition-colors`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Zap className="w-4 h-4 text-amber-500 fill-amber-500/20 stroke-[2.25] shrink-0" />
                  <span className="truncate">Quick Capture</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400 shrink-0 ml-2">
                  Ctrl+Shift+C
                </span>
              </button>
            )}

            {onOpenSearch && (
              <button
                id="nav-vault-search"
                onClick={onOpenSearch}
                className={`w-full flex items-center justify-between ${padSubBtn} text-left font-semibold text-stone-900 dark:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Search className="w-4 h-4 text-amber-500 stroke-[2.25] shrink-0" />
                  <span className="truncate">Vault Search</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400 shrink-0 ml-2">
                  Ctrl+Shift+F
                </span>
              </button>
            )}

            {onOpenCommandPalette && (
              <button
                id="nav-command-palette"
                onClick={onOpenCommandPalette}
                className={`w-full flex items-center justify-between ${padSubBtn} text-left font-semibold text-stone-900 dark:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Command className="w-4 h-4 text-amber-500 stroke-[2.25] shrink-0" />
                  <span className="truncate">Command Palette</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400 shrink-0 ml-2">
                  Ctrl+K
                </span>
              </button>
            )}

            {onOpenSmartViews && (
              <button
                id="nav-smart-views"
                onClick={onOpenSmartViews}
                className={`w-full flex items-center justify-between ${padSubBtn} text-left font-semibold text-stone-900 dark:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Sparkles className="w-4 h-4 text-amber-500 stroke-[2.25] shrink-0" />
                  <span className="truncate">Smart Views</span>
                </div>
              </button>
            )}
          </div>

          {/* Knowledge & Canvas Section */}
          <div className="space-y-1 pt-1">
            <button
              onClick={() => setKnowledgeOpen(!knowledgeOpen)}
              className={padHeader}
            >
              <div className="flex items-center gap-1.5">
                {knowledgeOpen ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
                <span>Knowledge & Canvas</span>
              </div>
              <BookOpen className="w-3.5 h-3.5" />
            </button>

            {knowledgeOpen && (
              <div className={compactMode ? 'space-y-0.5' : 'space-y-1'}>
                {onOpenPDFReader && (
                  <button
                    id="nav-pdf-reader"
                    onClick={onOpenPDFReader}
                    className={`w-full flex items-center justify-between ${padSubBtn} text-left font-semibold text-stone-900 dark:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <BookOpen className="w-4 h-4 text-rose-500 stroke-[2.25] shrink-0" />
                      <span className="truncate">PDF Reader & Papers</span>
                    </div>
                  </button>
                )}

                {onOpenReferences && (
                  <button
                    id="nav-reference-library"
                    onClick={onOpenReferences}
                    className={`w-full flex items-center justify-between ${padSubBtn} text-left font-semibold text-stone-900 dark:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Bookmark className="w-4 h-4 text-rose-500 stroke-[2.25] shrink-0" />
                      <span className="truncate">Reference Library</span>
                    </div>
                  </button>
                )}

                {onOpenReview && (
                  <button
                    id="nav-review-workspace"
                    onClick={onOpenReview}
                    className={`w-full flex items-center justify-between ${padSubBtn} text-left font-semibold text-stone-900 dark:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Brain className="w-4 h-4 text-rose-500 stroke-[2.25] shrink-0" />
                      <span className="truncate">Review & Recall</span>
                    </div>
                  </button>
                )}

                {onOpenCollections && (
                  <button
                    id="nav-collections-workspace"
                    onClick={onOpenCollections}
                    className={`w-full flex items-center justify-between ${padSubBtn} text-left font-semibold text-stone-900 dark:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Layers className="w-4 h-4 text-indigo-500 stroke-[2.25] shrink-0" />
                      <span className="truncate">Collections</span>
                    </div>
                  </button>
                )}

                {onOpenTemplates && (
                  <button
                    id="nav-templates-workspace"
                    onClick={onOpenTemplates}
                    className={`w-full flex items-center justify-between ${padSubBtn} text-left font-semibold text-stone-900 dark:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <LayoutTemplate className="w-4 h-4 text-amber-500 stroke-[2.25] shrink-0" />
                      <span className="truncate">Templates & Creator</span>
                    </div>
                  </button>
                )}

                {onOpenDashboards && (
                  <button
                    id="nav-dashboards-workspace"
                    onClick={onOpenDashboards}
                    className={`w-full flex items-center justify-between ${padSubBtn} text-left font-semibold text-stone-900 dark:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <LayoutDashboard className="w-4 h-4 text-amber-500 stroke-[2.25] shrink-0" />
                      <span className="truncate">Dashboards</span>
                    </div>
                  </button>
                )}

                {onOpenCanvas && (
                  <button
                    id="nav-spatial-canvas"
                    onClick={onOpenCanvas}
                    className={`w-full flex items-center justify-between ${padSubBtn} text-left font-semibold text-stone-900 dark:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Sparkles className="w-4 h-4 text-indigo-500 stroke-[2.25] shrink-0" />
                      <span className="truncate">Spatial Canvas</span>
                    </div>
                  </button>
                )}

                {onOpenMedia && (
                  <button
                    id="nav-media-library"
                    onClick={onOpenMedia}
                    className={`w-full flex items-center justify-between ${padSubBtn} text-left font-semibold text-stone-900 dark:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <HardDrive className="w-4 h-4 text-teal-600 dark:text-teal-400 stroke-[2.25] shrink-0" />
                      <span className="truncate">Media Library</span>
                    </div>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Life & Planning Section */}
          <div className="space-y-1 pt-1">
            <button
              onClick={() => setPlanningOpen(!planningOpen)}
              className={padHeader}
            >
              <div className="flex items-center gap-1.5">
                {planningOpen ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
                <span>Life & Planning</span>
              </div>
              <Compass className="w-3.5 h-3.5" />
            </button>

            {planningOpen && (
              <div className={compactMode ? 'space-y-0.5' : 'space-y-1'}>
                {onOpenPlanningHome && (
                  <button
                    id="nav-planning-hub"
                    onClick={onOpenPlanningHome}
                    className={`w-full flex items-center justify-between ${padSubBtn} text-left font-semibold text-stone-900 dark:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Compass className="w-4 h-4 text-indigo-500 stroke-[2.25] shrink-0" />
                      <span className="truncate">Planning Hub</span>
                    </div>
                  </button>
                )}

                {onOpenGoalsProjects && (
                  <button
                    id="nav-goals-projects"
                    onClick={onOpenGoalsProjects}
                    className={`w-full flex items-center justify-between ${padSubBtn} text-left font-semibold text-stone-900 dark:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Target className="w-4 h-4 text-indigo-500 stroke-[2.25] shrink-0" />
                      <span className="truncate">Goals & Projects</span>
                    </div>
                  </button>
                )}

                {onOpenRoutines && (
                  <button
                    id="nav-routines-workspace"
                    onClick={onOpenRoutines}
                    className={`w-full flex items-center justify-between ${padSubBtn} text-left font-semibold text-stone-900 dark:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Activity className="w-4 h-4 text-amber-500 stroke-[2.25] shrink-0" />
                      <span className="truncate">Routines & Tracking</span>
                    </div>
                  </button>
                )}

                {onOpenLearning && (
                  <button
                    id="nav-learning-workspace"
                    onClick={onOpenLearning}
                    className={`w-full flex items-center justify-between ${padSubBtn} text-left font-semibold text-stone-900 dark:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <GraduationCap className="w-4 h-4 text-indigo-500 stroke-[2.25] shrink-0" />
                      <span className="truncate">Learning Hub</span>
                    </div>
                  </button>
                )}

                {onOpenLibrary && (
                  <button
                    id="nav-library-workspace"
                    onClick={onOpenLibrary}
                    className={`w-full flex items-center justify-between ${padSubBtn} text-left font-semibold text-stone-900 dark:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <BookOpen className="w-4 h-4 text-amber-500 stroke-[2.25] shrink-0" />
                      <span className="truncate">Library & Reading</span>
                    </div>
                  </button>
                )}

                {onOpenFinance && (
                  <button
                    id="nav-finance-workspace"
                    onClick={onOpenFinance}
                    className={`w-full flex items-center justify-between ${padSubBtn} text-left font-semibold text-stone-900 dark:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Landmark className="w-4 h-4 text-amber-500 stroke-[2.25] shrink-0" />
                      <span className="truncate">Personal Finance</span>
                    </div>
                  </button>
                )}

                {onOpenHealth && (
                  <button
                    id="nav-health-workspace"
                    onClick={onOpenHealth}
                    className={`w-full flex items-center justify-between ${padSubBtn} text-left font-semibold text-stone-900 dark:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Heart className="w-4 h-4 text-emerald-500 stroke-[2.25] shrink-0" />
                      <span className="truncate">Health & Fitness</span>
                    </div>
                  </button>
                )}

                {onOpenTravel && (
                  <button
                    id="nav-travel-workspace"
                    onClick={onOpenTravel}
                    className={`w-full flex items-center justify-between ${padSubBtn} text-left font-semibold text-stone-900 dark:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Globe className="w-4 h-4 text-amber-500 stroke-[2.25] shrink-0" />
                      <span className="truncate">Travel & Places</span>
                    </div>
                  </button>
                )}

                {onOpenAssets && (
                  <button
                    id="nav-assets-workspace"
                    onClick={onOpenAssets}
                    className={`w-full flex items-center justify-between ${padSubBtn} text-left font-semibold text-stone-900 dark:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Package className="w-4 h-4 text-indigo-500 stroke-[2.25] shrink-0" />
                      <span className="truncate">Home & Assets</span>
                    </div>
                  </button>
                )}

                {onOpenDecisions && (
                  <button
                    id="nav-decisions-workspace"
                    onClick={onOpenDecisions}
                    className={`w-full flex items-center justify-between ${padSubBtn} text-left font-semibold text-stone-900 dark:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Scale className="w-4 h-4 text-amber-500 stroke-[2.25] shrink-0" />
                      <span className="truncate">Decisions & Reflection</span>
                    </div>
                  </button>
                )}

                {onOpenPeople && (
                  <button
                    id="nav-people-workspace"
                    onClick={onOpenPeople}
                    className={`w-full flex items-center justify-between ${padSubBtn} text-left font-semibold text-stone-900 dark:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Users className="w-4 h-4 text-blue-500 stroke-[2.25] shrink-0" />
                      <span className="truncate">People & Contacts</span>
                    </div>
                  </button>
                )}

                {onOpenTimeline && (
                  <button
                    id="nav-timeline-workspace"
                    onClick={onOpenTimeline}
                    className={`w-full flex items-center justify-between ${padSubBtn} text-left font-semibold text-stone-900 dark:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Activity className="w-4 h-4 text-purple-500 stroke-[2.25] shrink-0" />
                      <span className="truncate">Timeline</span>
                    </div>
                  </button>
                )}

                {onOpenCalendar && (
                  <button
                    id="nav-calendar-workspace"
                    onClick={onOpenCalendar}
                    className={`w-full flex items-center justify-between ${padSubBtn} text-left font-semibold text-stone-900 dark:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Calendar className="w-4 h-4 text-amber-500 stroke-[2.25] shrink-0" />
                      <span className="truncate">Calendar</span>
                    </div>
                  </button>
                )}

                {onOpenAgenda && (
                  <button
                    id="nav-agenda-workspace"
                    onClick={onOpenAgenda}
                    className={`w-full flex items-center justify-between ${padSubBtn} text-left font-semibold text-stone-900 dark:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <ListTodo className="w-4 h-4 text-emerald-500 stroke-[2.25] shrink-0" />
                      <span className="truncate">Agenda</span>
                    </div>
                  </button>
                )}

                {onOpenAutomations && (
                  <button
                    id="nav-automations"
                    onClick={onOpenAutomations}
                    className={`w-full flex items-center justify-between ${padSubBtn} text-left font-semibold text-stone-900 dark:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Zap className="w-4 h-4 text-amber-500 stroke-[2.25] shrink-0" />
                      <span className="truncate">Automations</span>
                    </div>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Vault Tools & System Section */}
          <div className="space-y-1 pt-1">
            <button
              onClick={() => setVaultToolsOpen(!vaultToolsOpen)}
              className={padHeader}
            >
              <div className="flex items-center gap-1.5">
                {vaultToolsOpen ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
                <span>Vault Tools & Operations</span>
              </div>
              <ShieldCheck className="w-4 h-4" />
            </button>

            {vaultToolsOpen && (
              <div className={compactMode ? 'space-y-0.5' : 'space-y-1'}>
                {onOpenExportCenter && (
                  <button
                    id="nav-export-center"
                    onClick={onOpenExportCenter}
                    className={`w-full flex items-center justify-between ${padSubBtn} text-left font-semibold text-stone-900 dark:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Share2 className="w-4 h-4 text-amber-600 dark:text-amber-400 stroke-[2.25] shrink-0" />
                      <span className="truncate">Export & Share</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400 shrink-0 ml-2">
                      Ctrl+Shift+E
                    </span>
                  </button>
                )}

                {onOpenPublishing && (
                  <button
                    id="nav-publishing-manager"
                    onClick={onOpenPublishing}
                    className={`w-full flex items-center justify-between ${padSubBtn} text-left font-semibold text-stone-900 dark:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Globe className="w-4 h-4 text-indigo-600 dark:text-indigo-400 stroke-[2.25] shrink-0" />
                      <span className="truncate">Publish & Export</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400 shrink-0 ml-2">
                      Ctrl+Shift+P
                    </span>
                  </button>
                )}

                {onOpenMigrationHub && (
                  <button
                    id="nav-migration-hub"
                    onClick={onOpenMigrationHub}
                    className={`w-full flex items-center justify-between ${padSubBtn} text-left font-semibold text-stone-900 dark:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <UploadCloud className="w-4 h-4 text-indigo-600 dark:text-indigo-400 stroke-[2.25] shrink-0" />
                      <span className="truncate">Import & Migrate</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400 shrink-0 ml-2">
                      Ctrl+Shift+M
                    </span>
                  </button>
                )}

                {onOpenVaultDoctor && (
                  <button
                    id="nav-vault-doctor"
                    onClick={onOpenVaultDoctor}
                    className={`w-full flex items-center justify-between ${padSubBtn} text-left font-semibold text-stone-900 dark:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Activity className="w-4 h-4 text-amber-600 dark:text-amber-400 stroke-[2.25] shrink-0" />
                      <span className="truncate">Vault Doctor</span>
                    </div>
                  </button>
                )}

                {onOpenRecoveryCenter && (
                  <button
                    id="nav-recovery-center"
                    onClick={onOpenRecoveryCenter}
                    className={`w-full flex items-center justify-between ${padSubBtn} text-left font-semibold text-stone-900 dark:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 stroke-[2.25] shrink-0" />
                      <span className="truncate">Recovery & Snapshots</span>
                    </div>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Folders Section */}
          <div className="space-y-1">
            <div className="flex items-center justify-between px-2 text-xs font-bold text-stone-800 dark:text-stone-200 uppercase tracking-wider">
              <button
                onClick={() => setFoldersOpen(!foldersOpen)}
                className="flex items-center gap-1.5 hover:text-stone-950 dark:hover:text-white"
              >
                {foldersOpen ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
                <span>Folders</span>
              </button>
              <button
                id="btn-add-folder"
                onClick={onOpenManageFolders}
                className="p-1 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-md text-stone-700 hover:text-stone-950 dark:text-stone-300 dark:hover:text-white"
                title="Manage Folders"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.25]" />
              </button>
            </div>

            {foldersOpen && (
              <div className="space-y-0.5 pl-1">
                {safeFolders.map((folder) => {
                  const count = getFolderNoteCount(folder.id);
                  const isSelected = safeFilter.selectedFolderId === folder.id;
                  return (
                    <button
                      key={folder.id}
                      onClick={() => selectFolder(folder.id)}
                      className={`w-full flex items-center justify-between ${padItem} text-left text-xs font-semibold transition-colors ${
                        isSelected
                          ? 'bg-amber-100 dark:bg-amber-950 text-amber-950 dark:text-amber-200 border border-amber-300/60 dark:border-amber-800/60'
                          : 'text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <FolderIcon
                          className="w-3.5 h-3.5 shrink-0"
                          style={{ color: folder.color || '#f59e0b' }}
                        />
                        <span className="truncate">{folder.name}</span>
                      </div>
                      <span className="text-[11px] font-mono text-stone-600 dark:text-stone-400 font-bold">
                        {count}
                      </span>
                    </button>
                  );
                })}

                <button
                  onClick={() => selectFolder('unorganized')}
                  className={`w-full flex items-center justify-between ${padItem} text-left text-xs font-semibold transition-colors ${
                    safeFilter.selectedFolderId === 'unorganized'
                      ? 'bg-amber-100 dark:bg-amber-950 text-amber-950 dark:text-amber-200 border border-amber-300/60 dark:border-amber-800/60'
                      : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <FolderOpen className="w-3.5 h-3.5 text-stone-600 dark:text-stone-400" />
                    <span>Unorganized</span>
                  </div>
                  <span className="text-[11px] font-mono text-stone-600 dark:text-stone-400 font-bold">
                    {activeNotes.filter((n) => !n.folderId).length}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Timeline / Month Scrubber Jump */}
          <div className="space-y-1">
            <button
              onClick={() => setTimelineOpen(!timelineOpen)}
              className="w-full flex items-center justify-between px-2 text-xs font-bold text-stone-800 dark:text-stone-200 uppercase tracking-wider hover:text-stone-950 dark:hover:text-white"
            >
              <div className="flex items-center gap-1.5">
                {timelineOpen ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
                <span>Timeline Scrubber</span>
              </div>
              <Clock className="w-3.5 h-3.5" />
            </button>

            {timelineOpen && (
              <div className="space-y-0.5 pl-1 max-h-44 overflow-y-auto pr-1">
                {monthGroups.map((group) => {
                  const isSelected = safeFilter.selectedMonth === group.key;
                  return (
                    <button
                      key={group.key}
                      onClick={() => selectMonth(group.key)}
                      className={`w-full flex items-center justify-between ${padItem} text-left text-xs font-semibold transition-colors ${
                        isSelected
                          ? 'bg-amber-100 dark:bg-amber-950 text-amber-950 dark:text-amber-200 border border-amber-300/60 dark:border-amber-800/60'
                          : 'text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800'
                      }`}
                    >
                      <span className="truncate">{group.label}</span>
                      <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 font-bold">
                        {group.notes.length}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Tags & Labels */}
          <div className="space-y-1">
            <div className="flex items-center justify-between px-2 text-xs font-bold text-stone-800 dark:text-stone-200 uppercase tracking-wider">
              <button
                onClick={() => setTagsOpen(!tagsOpen)}
                className="flex items-center gap-1.5 hover:text-stone-950 dark:hover:text-white transition-colors"
              >
                {tagsOpen ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
                <span>Tags & Labels</span>
                {uniqueTags.length > 0 && (
                  <span className="text-[10px] font-mono opacity-70">
                    ({uniqueTags.length})
                  </span>
                )}
              </button>
              {onOpenManageTags && (
                <button
                  id="btn-manage-tags"
                  onClick={onOpenManageTags}
                  className="p-1 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-md text-stone-700 hover:text-stone-950 dark:text-stone-300 dark:hover:text-white transition-colors"
                  title="Manage Tags (Rename, Delete, Merge)"
                  aria-label="Manage Tags"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 stroke-[2.25]" />
                </button>
              )}
            </div>

            {tagsOpen && (
              <div className="flex flex-wrap gap-1.5 pl-2 pt-1">
                {uniqueTags.length === 0 ? (
                  <div className="text-[11px] text-stone-600 dark:text-stone-400 py-1 italic">
                    No tags yet. Add #hashtags in notes.
                  </div>
                ) : (
                  uniqueTags.map(({ tag, count }) => {
                    const isSelected = safeFilter.selectedTag === tag;
                    return (
                      <button
                        key={tag}
                        onClick={() => selectTag(tag)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                          isSelected
                            ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                            : 'bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 border-stone-300 dark:border-stone-700 hover:bg-stone-200 dark:hover:bg-stone-700'
                        }`}
                      >
                        <Hash className="w-3 h-3 opacity-75 stroke-[2.25]" />
                        <span>{tag}</span>
                        <span className="text-[10px] opacity-80 font-mono">({count})</span>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Color Palette Quick Filters */}
          <div className="space-y-1">
            <button
              onClick={() => setColorsOpen(!colorsOpen)}
              className="w-full flex items-center justify-between px-2 text-xs font-bold text-stone-800 dark:text-stone-200 uppercase tracking-wider hover:text-stone-950 dark:hover:text-white"
            >
              <div className="flex items-center gap-1.5">
                {colorsOpen ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
                <span>Colors</span>
              </div>
              <Palette className="w-3.5 h-3.5" />
            </button>

            {colorsOpen && (
              <div className="grid grid-cols-4 gap-1.5 pl-2 pt-1">
                {COLOR_KEYS.map((colorKey) => {
                  const conf = NOTE_COLORS[colorKey];
                  const count =
                    uniqueColors.find((c) => c.color === colorKey)?.count || 0;
                  const isSelected = safeFilter.selectedColor === colorKey;

                  return (
                    <button
                      key={colorKey}
                      onClick={() => selectColor(colorKey)}
                      className={`flex flex-col items-center p-1.5 rounded-lg border text-[11px] transition-all ${
                        isSelected
                          ? 'ring-2 ring-amber-500 border-amber-600 font-bold'
                          : 'border-stone-300 dark:border-stone-700 hover:border-stone-500'
                      }`}
                      style={{ backgroundColor: conf.hex }}
                    >
                      <span className="text-stone-950 text-[10px] font-bold leading-none truncate max-w-full">
                        {conf.name.split(' ')[0]}
                      </span>
                      <span className="text-[10px] text-stone-900 font-mono font-bold mt-0.5">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Saved Searches */}
          {safeSavedSearches.length > 0 && (
            <div className="space-y-1">
              <button
                onClick={() => setSavedSearchesOpen(!savedSearchesOpen)}
                className="w-full flex items-center justify-between px-2 text-xs font-bold text-stone-800 dark:text-stone-200 uppercase tracking-wider hover:text-stone-950 dark:hover:text-white"
              >
                <div className="flex items-center gap-1.5">
                  {savedSearchesOpen ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                  <span>Saved Searches</span>
                </div>
                <Bookmark className="w-3.5 h-3.5" />
              </button>

              {savedSearchesOpen && (
                <div className="space-y-0.5 pl-1">
                  {safeSavedSearches.map((s) => {
                    const isSelected = safeFilter.searchQuery === s.query;
                    return (
                      <div
                        key={s.id}
                        className={`group flex items-center justify-between ${padItem} text-xs font-semibold transition-colors ${
                          isSelected
                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-950 dark:text-amber-200 border border-amber-300/60 dark:border-amber-800/60'
                            : 'text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800'
                        }`}
                      >
                        <button
                          onClick={() =>
                            onFilterChange((prev) => ({
                              ...(prev || safeFilter),
                              searchQuery: s.query,
                            }))
                          }
                          className="flex-1 text-left truncate flex items-center gap-2"
                        >
                          <Sparkles className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                          <span className="truncate">{s.name}</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteSavedSearch(s.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-rose-600 text-stone-600 dark:text-stone-400 transition-opacity"
                          title="Delete saved search"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Personalization & Workflows */}
          {onOpenPersonalization && (
            <div className="pt-2 border-t border-stone-200 dark:border-stone-800">
              <button
                id="nav-personalization-settings"
                onClick={onOpenPersonalization}
                className={`w-full flex items-center justify-between ${padSubBtn} text-left font-semibold text-stone-900 dark:text-stone-100 hover:bg-amber-100/60 dark:hover:bg-amber-950/40 hover:text-amber-700 dark:hover:text-amber-300 transition-colors`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <SlidersHorizontal className="w-4 h-4 text-amber-500 stroke-[2.25] shrink-0" />
                  <span className="truncate">Personalization</span>
                </div>
              </button>
            </div>
          )}

          {/* Archive & Trash */}
          <div className={`pt-2 border-t border-stone-200 dark:border-stone-800 ${compactMode ? 'space-y-0.5' : 'space-y-1'}`}>
            <button
              id="nav-archive"
              onClick={() => setScope('archived')}
              className={`w-full flex items-center justify-between ${padBtn} text-left font-semibold transition-colors ${
                safeFilter.scope === 'archived'
                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-950 dark:text-amber-200 border border-amber-300/60 dark:border-amber-800/60'
                  : 'text-stone-900 dark:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Archive className="w-4 h-4 text-stone-600 dark:text-stone-400 stroke-[2.25] shrink-0" />
                <span className="truncate">Archive</span>
              </div>
              {archiveCount > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-mono font-bold shrink-0 ml-2">
                  {archiveCount}
                </span>
              )}
            </button>

            <button
              id="nav-trash"
              onClick={() => setScope('trash')}
              className={`w-full flex items-center justify-between ${padBtn} text-left font-semibold transition-colors ${
                safeFilter.scope === 'trash'
                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-950 dark:text-amber-200 border border-amber-300/60 dark:border-amber-800/60'
                  : 'text-stone-900 dark:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Trash2 className="w-4 h-4 text-stone-600 dark:text-stone-400 stroke-[2.25] shrink-0" />
                <span className="truncate">Trash</span>
              </div>
              {trashCount > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-rose-200 dark:bg-rose-950 text-rose-950 dark:text-rose-200 font-mono font-bold shrink-0 ml-2">
                  {trashCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Footer info & trash clear */}
        {safeFilter.scope === 'trash' && trashCount > 0 && (
          <div className="p-3 bg-[#f0eee8] dark:bg-[#101013] border-t border-stone-200 dark:border-stone-800">
            <button
              id="btn-empty-trash"
              onClick={onEmptyTrash}
              className="w-full py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Empty Trash
            </button>
          </div>
        )}
        </div>
      </aside>
    </>
  );
};
