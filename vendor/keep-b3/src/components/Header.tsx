import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  SlidersHorizontal,
  LayoutGrid,
  List,
  Rows3,
  Calendar as CalendarIcon,
  Network,
  Kanban,
  Settings,
  FolderSync,
  Upload,
  Plus,
  Moon,
  Sun,
  Menu,
  X,
  Sparkles,
  ArrowUpDown,
  Tag,
  Palette,
  Folder as FolderIcon,
  Bookmark,
  CheckSquare,
  Keyboard,
  FileText,
  Layers,
  Activity,
  Lock,
  Shield,
  ShieldCheck,
  Command,
  Zap,
  Clock,
  Shuffle,
  Headphones,
  Dices,
  Compass,
  Flame,
  Grid2X2,
  Columns,
  GraduationCap,
  Timer,
  Boxes,
  Hourglass,
  Scale,
  Mic,
  LayoutTemplate,
  ListTodo,
  GitMerge,
  Presentation,
  Calculator,
} from 'lucide-react';
import { ViewMode, FilterState, SavedSearch, Folder, AppSettings, NoteColorKey, CustomTheme } from '../types';
import { NOTE_COLORS, COLOR_KEYS } from '../utils/colors';
import { isDarkTheme, THEME_LIST, getAllThemes } from '../utils/themes';
import { SyncStatusIndicator } from '../pkm/SyncStatusIndicator';
import { FilesystemStatusBadge } from '../pkm/filesystem/ui/FilesystemStatusBadge';
import { SyncStatusBadgeV2 } from '../pkm/v2/ui/SyncStatusBadgeV2';
import { ThemePalettePopover } from './ThemePalettePopover';
import { AmbientSoundscapesPopover } from './AmbientSoundscapesPopover';
import { soundscapeService } from '../utils/soundscapes';

interface HeaderProps {
  filter: FilterState;
  onFilterChange: (updater: (prev: FilterState) => FilterState) => void;
  savedSearches: SavedSearch[];
  folders: Folder[];
  settings: AppSettings;
  onSettingsChange: (newSettings: Partial<AppSettings>) => void;
  onOpenNewNote: (type?: 'text' | 'checklist') => void;
  onOpenTemplates?: () => void;
  onOpenVaultTasks?: () => void;
  onOpenNoteCompare?: () => void;
  onOpenSettings: () => void;
  onOpenThemeCreator?: (theme?: CustomTheme | null) => void;
  onOpenSync: () => void;
  onOpenImport: () => void;
  onOpenSmartViews?: () => void;
  onOpenShortcuts?: () => void;
  onOpenVaultDoctor?: () => void;
  onOpenEncryption?: () => void;
  onOpenSecurityAudit?: () => void;
  onOpenFilesystemBridge?: () => void;
  onOpenFilesystemConflicts?: () => void;
  onOpenConflictCenter?: () => void;
  onOpenDeviceManager?: () => void;
  onOpenDiagnostics?: () => void;
  onLockVault?: () => void;
  isVaultEncrypted?: boolean;
  onOpenCommandPalette?: () => void;
  onOpenVaultSearch?: () => void;
  onOpenDailyNote?: () => void;
  onOpenQuickCapture?: () => void;
  onOpenRandomNote?: () => void;
  onOpenIdeaSpark?: () => void;
  onOpenWritingSprint?: () => void;
  onOpenThoughtMatrix?: () => void;
  onOpenCornellNotes?: () => void;
  onOpenPomodoroFlow?: () => void;
  onOpenZettelkasten?: () => void;
  onOpenChronoCapsule?: () => void;
  onOpenSynthesisMatrix?: () => void;
  onOpenVoiceMemoStudio?: () => void;
  onOpenMindMapStudio?: () => void;
  onOpenMacroAutomation?: () => void;
  onOpenSerendipity?: () => void;
  onOpenActivityHeatmap?: () => void;
  onOpenFlashcards?: () => void;
  onOpenPresentationStudio?: () => void;
  onOpenReactiveSandbox?: () => void;
  onOpenCopilot?: () => void;
  onOpenSaveSearchModal: (currentQuery: string) => void;
  onToggleSidebar: () => void;
  notesCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  filter,
  onFilterChange,
  savedSearches,
  folders,
  settings,
  onSettingsChange,
  onOpenNewNote,
  onOpenTemplates,
  onOpenVaultTasks,
  onOpenNoteCompare,
  onOpenSettings,
  onOpenThemeCreator,
  onOpenSync,
  onOpenImport,
  onOpenSmartViews,
  onOpenShortcuts,
  onOpenVaultDoctor,
  onOpenEncryption,
  onOpenSecurityAudit,
  onOpenFilesystemBridge,
  onOpenFilesystemConflicts,
  onOpenConflictCenter,
  onOpenDeviceManager,
  onOpenDiagnostics,
  onLockVault,
  isVaultEncrypted,
  onOpenCommandPalette,
  onOpenVaultSearch,
  onOpenDailyNote,
  onOpenQuickCapture,
  onOpenRandomNote,
  onOpenIdeaSpark,
  onOpenWritingSprint,
  onOpenThoughtMatrix,
  onOpenCornellNotes,
  onOpenPomodoroFlow,
  onOpenZettelkasten,
  onOpenChronoCapsule,
  onOpenSynthesisMatrix,
  onOpenVoiceMemoStudio,
  onOpenMindMapStudio,
  onOpenMacroAutomation,
  onOpenSerendipity,
  onOpenActivityHeatmap,
  onOpenFlashcards,
  onOpenPresentationStudio,
  onOpenReactiveSandbox,
  onOpenCopilot,
  onOpenSaveSearchModal,
  onToggleSidebar,
  notesCount,
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

  const [searchFocused, setSearchFocused] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const [showThemePalette, setShowThemePalette] = useState(false);
  const [showSavedSearchesMenu, setShowSavedSearchesMenu] = useState(false);
  const [showHelperMenu, setShowHelperMenu] = useState(false);
  const [showSoundscapes, setShowSoundscapes] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);
  const themePaletteRef = useRef<HTMLDivElement>(null);
  const soundscapesRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('open_notes_recent_searches');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const recordRecentSearch = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) return;
    setRecentSearches((prev) => {
      const updated = [trimmed, ...prev.filter((q) => q.toLowerCase() !== trimmed.toLowerCase())].slice(0, 6);
      try {
        localStorage.setItem('open_notes_recent_searches', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem('open_notes_recent_searches');
    } catch {
      // ignore
    }
  };

  // Close menus on outside click - only attach when a menu is open
  const isAnyMenuOpen =
    showSortMenu ||
    showToolsMenu ||
    showThemePalette ||
    showSavedSearchesMenu ||
    showHelperMenu ||
    showSoundscapes;

  useEffect(() => {
    if (!isAnyMenuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (sortRef.current && !sortRef.current.contains(target)) {
        setShowSortMenu(false);
      }
      if (toolsRef.current && !toolsRef.current.contains(target)) {
        setShowToolsMenu(false);
      }
      if (themePaletteRef.current && !themePaletteRef.current.contains(target)) {
        setShowThemePalette(false);
      }
      if (soundscapesRef.current && !soundscapesRef.current.contains(target)) {
        setShowSoundscapes(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(target)) {
        setShowSavedSearchesMenu(false);
        setShowHelperMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isAnyMenuOpen]);

  const handleQueryChange = (val: string) => {
    onFilterChange((prev) => ({ ...(prev || safeFilter), searchQuery: val }));
  };

  const handleClearSearch = () => {
    onFilterChange((prev) => ({
      ...(prev || safeFilter),
      searchQuery: '',
      selectedTag: null,
      selectedColor: null,
      selectedFolderId: null,
      selectedMonth: null,
      selectedType: 'all',
      hasReminderOnly: false,
      hasImagesOnly: false,
      hasLinksOnly: false,
    }));
  };

  const appendSearchToken = (token: string) => {
    onFilterChange((prev) => {
      const current = (prev?.searchQuery || safeFilter.searchQuery || '').trim();
      const updated = current ? `${current} ${token}` : token;
      return { ...(prev || safeFilter), searchQuery: updated };
    });
    setShowHelperMenu(false);
  };

  const viewIcons: Record<ViewMode, { label: string; icon: React.ReactNode }> = {
    masonry: { label: 'Masonry Grid', icon: <LayoutGrid className="w-4 h-4" /> },
    list: { label: 'List View', icon: <List className="w-4 h-4" /> },
    recent: { label: 'Recent Notes', icon: <Clock className="w-4 h-4" /> },
    stacked: { label: 'Stacked Feed', icon: <Rows3 className="w-4 h-4" /> },
    calendar: { label: 'Calendar View', icon: <CalendarIcon className="w-4 h-4" /> },
    graph: { label: 'Knowledge Graph', icon: <Network className="w-4 h-4" /> },
    kanban: { label: 'Kanban Board', icon: <Kanban className="w-4 h-4" /> },
  };

  const isDarkActive = isDarkTheme(settings.theme, settings.customThemes);

  const allThemes = React.useMemo(() => getAllThemes(settings.customThemes), [settings.customThemes]);
  const currentThemeDef = React.useMemo(
    () => allThemes.find((t) => t.id === settings.theme) || allThemes[0],
    [allThemes, settings.theme]
  );

  const toggleTheme = () => {
    const next: 'light' | 'dark' = isDarkActive ? 'light' : 'dark';
    onSettingsChange({ theme: next });
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-white dark:bg-[#18181c] border-b border-stone-200 dark:border-stone-800 shadow-2xs transition-colors">
      <div className="flex items-center justify-between px-3 sm:px-6 h-16 gap-2 sm:gap-4">
        {/* Left: Brand & Mobile Sidebar Toggle */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            id="btn-sidebar-toggle"
            onClick={onToggleSidebar}
            className="w-9 h-9 min-w-[36px] min-h-[36px] p-2 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center justify-center transition-colors"
            title="Toggle Navigation"
            aria-label="Toggle Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center text-white shadow-xs font-bold tracking-tight text-lg shrink-0">
              K
            </div>
            <div className="hidden sm:block">
              <h1 className="font-bold text-stone-950 dark:text-white text-base leading-none tracking-tight flex items-center gap-2">
                KEEP
                <span className="text-xs px-2 py-0.5 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 font-mono font-bold">
                  {notesCount}
                </span>
              </h1>
            </div>
          </div>
        </div>

        {/* Center: Search Bar & Power Filters */}
        <div
          ref={searchContainerRef}
          className="relative flex-1 min-w-[140px] max-w-2xl mx-1 sm:mx-4"
        >
          <div
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-2xl bg-stone-100 dark:bg-stone-800/90 border transition-all ${
              searchFocused
                ? 'bg-white dark:bg-stone-900 border-amber-500 shadow-xs ring-2 ring-amber-500/20'
                : 'border-stone-300 dark:border-stone-700 hover:border-stone-400 dark:hover:border-stone-600'
            }`}
          >
            <Search className="w-4 h-4 text-stone-500 dark:text-stone-400 shrink-0" />
            <input
              id="main-search-input"
              type="text"
              placeholder="Search notes, #tags, color:yellow, [[links]]..."
              value={safeFilter.searchQuery}
              onChange={(e) => handleQueryChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  recordRecentSearch(safeFilter.searchQuery);
                  setShowHelperMenu(false);
                }
              }}
              onBlur={() => {
                if (safeFilter.searchQuery) {
                  recordRecentSearch(safeFilter.searchQuery);
                }
              }}
              onFocus={() => {
                setSearchFocused(true);
                setShowHelperMenu(true);
              }}
              className="w-full bg-transparent text-sm font-medium text-stone-950 dark:text-white placeholder-stone-500 dark:placeholder-stone-400 focus:outline-none"
            />

            {!safeFilter.searchQuery && (
              <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-medium text-stone-400 dark:text-stone-500 bg-stone-200/60 dark:bg-stone-800/80 rounded border border-stone-300 dark:border-stone-700 shrink-0 select-none">
                Ctrl+F
              </kbd>
            )}

            {safeFilter.searchQuery && (
              <button
                onClick={handleClearSearch}
                className="p-1 text-stone-600 hover:text-stone-950 dark:text-stone-300 dark:hover:text-white rounded-lg shrink-0 transition-colors"
                title="Clear Search (Esc)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Quick helper popover trigger */}
            <button
              onClick={() => setShowHelperMenu(!showHelperMenu)}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center justify-center shrink-0 transition-colors ${
                showHelperMenu
                  ? 'bg-amber-200 text-amber-950 dark:bg-amber-950 dark:text-amber-200'
                  : 'text-stone-600 hover:text-stone-950 dark:text-stone-300 dark:hover:text-white hover:bg-stone-200 dark:hover:bg-stone-700'
              }`}
              title="Search syntax helpers"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Search Syntax & Saved Search Helper Popover */}
          {showHelperMenu && (
            <div className="absolute left-0 right-0 top-full mt-2 p-3 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-2xl shadow-xl z-50 text-xs space-y-3">
              <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-2">
                <span className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Search Syntax & Saved Presets
                </span>
                {safeFilter.searchQuery && (
                  <button
                    onClick={() => {
                      setShowHelperMenu(false);
                      onOpenSaveSearchModal(safeFilter.searchQuery);
                    }}
                    className="text-amber-700 dark:text-amber-400 hover:underline font-bold flex items-center gap-1"
                  >
                    <Bookmark className="w-3 h-3" /> Save this search
                  </button>
                )}
              </div>

              {/* Recent searches history chips */}
              {recentSearches.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-stone-700 dark:text-stone-300 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                      <Clock className="w-3 h-3 text-stone-400" /> Recent Searches
                    </span>
                    <button
                      onClick={clearRecentSearches}
                      className="text-[10px] text-stone-400 hover:text-rose-500 font-medium transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {recentSearches.map((term, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          handleQueryChange(term);
                          recordRecentSearch(term);
                          setShowHelperMenu(false);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800/80 hover:bg-amber-100 dark:hover:bg-amber-950/60 text-stone-800 dark:text-stone-200 text-xs font-medium border border-stone-200 dark:border-stone-700 transition-colors"
                      >
                        <Clock className="w-2.5 h-2.5 text-stone-400 shrink-0" />
                        <span className="truncate max-w-[140px]">{term}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick filter chips to insert */}
              <div>
                <span className="text-stone-700 dark:text-stone-300 text-[11px] block mb-1.5 font-bold uppercase tracking-wider">
                  Insert Filter Tokens
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => appendSearchToken('type:checklist')}
                    className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-900 dark:text-stone-100 font-mono text-[11px] font-semibold border border-stone-300 dark:border-stone-700"
                  >
                    type:checklist
                  </button>
                  <button
                    onClick={() => appendSearchToken('has:reminder')}
                    className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-900 dark:text-stone-100 font-mono text-[11px] font-semibold border border-stone-300 dark:border-stone-700"
                  >
                    has:reminder
                  </button>
                  <button
                    onClick={() => appendSearchToken('has:links')}
                    className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-900 dark:text-stone-100 font-mono text-[11px] font-semibold border border-stone-300 dark:border-stone-700"
                  >
                    has:links
                  </button>
                  <button
                    onClick={() => appendSearchToken('has:images')}
                    className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-900 dark:text-stone-100 font-mono text-[11px] font-semibold border border-stone-300 dark:border-stone-700"
                  >
                    has:images
                  </button>
                  <button
                    onClick={() => appendSearchToken('is:pinned')}
                    className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-900 dark:text-stone-100 font-mono text-[11px] font-semibold border border-stone-300 dark:border-stone-700"
                  >
                    is:pinned
                  </button>
                  <button
                    onClick={() => appendSearchToken('is:archived')}
                    className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-900 dark:text-stone-100 font-mono text-[11px] font-semibold border border-stone-300 dark:border-stone-700"
                  >
                    is:archived
                  </button>
                  <button
                    onClick={() => appendSearchToken('is:untagged')}
                    className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-900 dark:text-stone-100 font-mono text-[11px] font-semibold border border-stone-300 dark:border-stone-700"
                  >
                    is:untagged
                  </button>
                  <button
                    onClick={() => appendSearchToken('is:unorganized')}
                    className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-900 dark:text-stone-100 font-mono text-[11px] font-semibold border border-stone-300 dark:border-stone-700"
                  >
                    is:unorganized
                  </button>
                </div>
              </div>

              {/* Saved searches list if any */}
              {savedSearches.length > 0 && (
                <div>
                  <span className="text-stone-700 dark:text-stone-300 text-[11px] block mb-1.5 font-bold uppercase tracking-wider">
                    Saved Searches
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {savedSearches.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          onFilterChange((prev) => ({ ...prev, searchQuery: s.query }));
                          setShowHelperMenu(false);
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-left bg-amber-100/70 dark:bg-amber-950/50 hover:bg-amber-200 dark:hover:bg-amber-900/70 text-stone-950 dark:text-stone-100 font-semibold border border-amber-300/50 dark:border-amber-800/50 transition-colors"
                      >
                        <Bookmark className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span className="truncate">{s.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: View Switcher, Actions & Tools */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Desktop View Modes Switcher */}
          <div
            role="group"
            aria-label="View mode switcher"
            className="hidden sm:flex items-center p-0.5 rounded-xl bg-stone-100 dark:bg-stone-800/90 border border-stone-200 dark:border-stone-700/80"
          >
            {(['masonry', 'list', 'recent', 'stacked', 'calendar', 'graph', 'kanban'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                id={`btn-view-${mode}`}
                onClick={() => {
                  onFilterChange((prev) => ({ ...(prev || safeFilter), viewMode: mode }));
                  onSettingsChange({ defaultViewMode: mode });
                }}
                className={`w-7 h-7 rounded-lg transition-all flex items-center justify-center focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none ${
                  (filter?.viewMode || settings.defaultViewMode) === mode
                    ? 'bg-amber-500 text-white font-bold shadow-xs'
                    : 'text-stone-700 hover:text-stone-950 dark:text-stone-300 dark:hover:text-white hover:bg-stone-200/80 dark:hover:bg-stone-700'
                }`}
                title={viewIcons[mode].label}
                aria-label={viewIcons[mode].label}
                aria-pressed={(filter?.viewMode || settings.defaultViewMode) === mode}
              >
                {viewIcons[mode].icon}
              </button>
            ))}
          </div>

          {/* Mobile View Mode Single Dropdown */}
          <div className="sm:hidden relative">
            <button
              id="btn-mobile-view-menu"
              type="button"
              onClick={() => setShowSortMenu(false)}
              className="w-8 h-8 p-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-800 dark:text-stone-200 flex items-center justify-center focus-visible:ring-2 focus-visible:ring-amber-500"
              title={`Current View: ${viewIcons[filter?.viewMode || settings.defaultViewMode || 'masonry'].label}`}
              aria-label={`View Mode: ${viewIcons[filter?.viewMode || settings.defaultViewMode || 'masonry'].label}`}
            >
              {viewIcons[filter?.viewMode || settings.defaultViewMode || 'masonry'].icon}
            </button>
          </div>

          {/* Sort Menu */}
          <div ref={sortRef} className="relative hidden md:block">
            <button
              id="btn-sort-menu"
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="h-8 px-2 rounded-xl text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors flex items-center gap-1 text-xs font-medium focus-visible:ring-2 focus-visible:ring-amber-500 border border-stone-200/70 dark:border-stone-800"
              title="Sort Notes"
              aria-label="Sort Notes"
              aria-expanded={showSortMenu}
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden xl:inline text-[11px] font-semibold">
                {settings.sortBy === 'updatedAt'
                  ? 'Modified'
                  : settings.sortBy === 'createdAt'
                  ? 'Created'
                  : settings.sortBy === 'title'
                  ? 'Title'
                  : settings.sortBy === 'reminder'
                  ? 'Reminder'
                  : 'Custom Order'}
              </span>
            </button>

            {showSortMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 p-1.5 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-xl shadow-xl z-50 text-xs space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
                <span className="px-2 py-1 text-[10px] font-bold uppercase text-stone-500 dark:text-stone-400 block">
                  Sort Notes By
                </span>
                {[
                  { key: 'updatedAt', label: 'Last Modified' },
                  { key: 'createdAt', label: 'Date Created' },
                  { key: 'title', label: 'Title Alphabetical' },
                  { key: 'reminder', label: 'Reminder Date' },
                  { key: 'manual', label: 'Custom / Drag Order' },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => {
                      const nextOrder =
                        settings.sortBy === item.key && settings.sortOrder === 'desc'
                          ? 'asc'
                          : 'desc';
                      onSettingsChange({
                        sortBy: item.key as any,
                        sortOrder: nextOrder,
                      });
                      setShowSortMenu(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                      settings.sortBy === item.key
                        ? 'bg-amber-100 dark:bg-amber-950 text-amber-950 dark:text-amber-200 font-bold'
                        : 'text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 font-medium'
                    }`}
                  >
                    <span>{item.label}</span>
                    {settings.sortBy === item.key && (
                      <span className="text-[10px] text-amber-700 dark:text-amber-400 uppercase font-mono font-bold">
                        {settings.sortOrder}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Daily Note Primary Action */}
          {onOpenDailyNote && (
            <button
              id="btn-daily-note"
              onClick={onOpenDailyNote}
              className="h-8 px-2.5 rounded-xl text-stone-700 dark:text-stone-200 hover:bg-amber-100/70 dark:hover:bg-amber-950/40 hover:text-amber-700 dark:hover:text-amber-300 transition-colors flex items-center gap-1.5 text-xs font-semibold border border-stone-200/70 dark:border-stone-800"
              title="Today's Daily Note (Alt+D)"
            >
              <CalendarIcon className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="hidden lg:inline text-[11px]">Daily</span>
            </button>
          )}

          {/* Command Palette Button */}
          {onOpenCommandPalette && (
            <button
              id="btn-command-palette"
              onClick={onOpenCommandPalette}
              className="h-8 px-2.5 rounded-xl text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors flex items-center gap-1.5 text-xs font-semibold border border-stone-200/70 dark:border-stone-800"
              title="Command Palette (Ctrl+K / ⌘K)"
            >
              <Command className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-medium text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 rounded border border-stone-300/80 dark:border-stone-700">
                ⌘K
              </kbd>
            </button>
          )}

          {/* Real-Time Sync Status Badge */}
          <SyncStatusBadgeV2
            onOpenConflictCenter={onOpenConflictCenter}
            onOpenDeviceManager={onOpenDeviceManager}
            onOpenDiagnostics={onOpenDiagnostics}
          />

          {/* Vault Lock Button if Encrypted */}
          {isVaultEncrypted && onLockVault && (
            <button
              id="btn-lock-vault"
              onClick={onLockVault}
              className="h-8 px-2.5 rounded-xl text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors flex items-center gap-1 text-xs font-semibold border border-emerald-300 dark:border-emerald-800"
              title="Lock Vault (Wipe keys and protect notes in memory)"
            >
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline text-[11px]">Lock</span>
            </button>
          )}

          {/* Consolidated Workspace & Vault Tools Menu */}
          <div ref={toolsRef} className="relative">
            <button
              id="btn-workspace-tools-menu"
              onClick={() => setShowToolsMenu(!showToolsMenu)}
              className={`h-8 px-2.5 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-semibold border ${
                showToolsMenu
                  ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                  : 'text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 border-stone-200/80 dark:border-stone-800'
              }`}
              title="Vault Tools & Utilities"
              aria-label="Vault Tools Menu"
              aria-expanded={showToolsMenu}
            >
              <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden md:inline text-[11px]">Tools</span>
            </button>

            {showToolsMenu && (
              <div className="absolute right-0 top-full mt-2 w-64 p-2 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-2xl shadow-2xl z-50 text-xs divide-y divide-stone-100 dark:divide-stone-800/80 animate-in fade-in zoom-in-95 duration-100 max-h-[85vh] overflow-y-auto">
                {/* Search & Intelligence */}
                <div className="pb-1.5">
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                    Search & Discovery
                  </div>
                  {onOpenVaultSearch && (
                    <button
                      onClick={() => {
                        setShowToolsMenu(false);
                        onOpenVaultSearch();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-stone-800 dark:text-stone-200 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-700 dark:hover:text-amber-300 font-medium transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Search className="w-3.5 h-3.5 text-amber-500" />
                        <span>Vault Deep Search</span>
                      </div>
                      <kbd className="text-[10px] font-mono text-stone-400">Ctrl+Shift+F</kbd>
                    </button>
                  )}
                  {onOpenSmartViews && (
                    <button
                      onClick={() => {
                        setShowToolsMenu(false);
                        onOpenSmartViews();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-stone-800 dark:text-stone-200 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-700 dark:hover:text-amber-300 font-medium transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>Smart Views</span>
                      </div>
                    </button>
                  )}
                  {onOpenCopilot && (
                    <button
                      onClick={() => {
                        setShowToolsMenu(false);
                        onOpenCopilot();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-stone-800 dark:text-stone-200 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-700 dark:hover:text-amber-300 font-medium transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>Local Assistant</span>
                      </div>
                    </button>
                  )}
                  {onOpenRandomNote && (
                    <button
                      onClick={() => {
                        setShowToolsMenu(false);
                        onOpenRandomNote();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-stone-800 dark:text-stone-200 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-700 dark:hover:text-amber-300 font-medium transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Shuffle className="w-3.5 h-3.5 text-amber-500" />
                        <span>Random Note</span>
                      </div>
                      <kbd className="text-[10px] font-mono text-stone-400">Alt+R</kbd>
                    </button>
                  )}
                  {onOpenIdeaSpark && (
                    <button
                      onClick={() => {
                        setShowToolsMenu(false);
                        onOpenIdeaSpark();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-stone-800 dark:text-stone-200 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-700 dark:hover:text-amber-300 font-medium transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Dices className="w-3.5 h-3.5 text-amber-500" />
                        <span>Idea Spark & Combinator</span>
                      </div>
                      <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 font-bold">Spark</span>
                    </button>
                  )}
                  {onOpenWritingSprint && (
                    <button
                      onClick={() => {
                        setShowToolsMenu(false);
                        onOpenWritingSprint();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-stone-800 dark:text-stone-200 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-700 dark:hover:text-amber-300 font-medium transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Flame className="w-3.5 h-3.5 text-amber-500" />
                        <span>Writing Sprint Arena</span>
                      </div>
                      <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 font-bold">Flow</span>
                    </button>
                  )}
                  {onOpenThoughtMatrix && (
                    <button
                      onClick={() => {
                        setShowToolsMenu(false);
                        onOpenThoughtMatrix();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-stone-800 dark:text-stone-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Grid2X2 className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Thought Matrix (2×2 Studio)</span>
                      </div>
                      <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-bold">Matrix</span>
                    </button>
                  )}
                  {onOpenCornellNotes && (
                    <button
                      id="btn-header-cornell-notes"
                      onClick={() => {
                        setShowToolsMenu(false);
                        onOpenCornellNotes();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-stone-800 dark:text-stone-200 hover:bg-violet-50 dark:hover:bg-violet-950/40 hover:text-violet-700 dark:hover:text-violet-300 font-medium transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Columns className="w-3.5 h-3.5 text-violet-500" />
                        <span>Cornell Notes & Recall</span>
                      </div>
                      <span className="text-[10px] font-mono text-violet-600 dark:text-violet-400 font-bold">Cornell</span>
                    </button>
                  )}
                  {onOpenPomodoroFlow && (
                    <button
                      onClick={() => {
                        setShowToolsMenu(false);
                        onOpenPomodoroFlow();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-stone-800 dark:text-stone-200 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-700 dark:hover:text-rose-300 font-medium transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Timer className="w-3.5 h-3.5 text-rose-500" />
                        <span>Pomodoro & Interstitial Hub</span>
                      </div>
                      <span className="text-[10px] font-mono text-rose-600 dark:text-rose-400 font-bold">P1 Focus</span>
                    </button>
                  )}
                  {onOpenZettelkasten && (
                    <button
                      onClick={() => {
                        setShowToolsMenu(false);
                        onOpenZettelkasten();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-stone-800 dark:text-stone-200 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-700 dark:hover:text-amber-300 font-medium transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Boxes className="w-3.5 h-3.5 text-amber-500" />
                        <span>Zettelkasten Slip-Box</span>
                      </div>
                      <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 font-bold">P2 Zettel</span>
                    </button>
                  )}
                  {onOpenChronoCapsule && (
                    <button
                      onClick={() => {
                        setShowToolsMenu(false);
                        onOpenChronoCapsule();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-stone-800 dark:text-stone-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Hourglass className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Chrono Capsule & Reading</span>
                      </div>
                      <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-bold">P3 Chrono</span>
                    </button>
                  )}
                  {onOpenSynthesisMatrix && (
                    <button
                      onClick={() => {
                        setShowToolsMenu(false);
                        onOpenSynthesisMatrix();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-stone-800 dark:text-stone-200 hover:bg-teal-50 dark:hover:bg-teal-950/40 hover:text-teal-700 dark:hover:text-teal-300 font-medium transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Scale className="w-3.5 h-3.5 text-teal-500" />
                        <span>Synthesis & Comparison</span>
                      </div>
                      <span className="text-[10px] font-mono text-teal-600 dark:text-teal-400 font-bold">P4 Matrix</span>
                    </button>
                  )}
                  {onOpenVoiceMemoStudio && (
                    <button
                      onClick={() => {
                        setShowToolsMenu(false);
                        onOpenVoiceMemoStudio();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-stone-800 dark:text-stone-200 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-700 dark:hover:text-rose-300 font-medium transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Mic className="w-3.5 h-3.5 text-rose-500" />
                        <span>Voice Memo & Audio Studio</span>
                      </div>
                      <span className="text-[10px] font-mono text-rose-600 dark:text-rose-400 font-bold">P5 Voice</span>
                    </button>
                  )}
                  {onOpenMindMapStudio && (
                    <button
                      onClick={() => {
                        setShowToolsMenu(false);
                        onOpenMindMapStudio();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-stone-800 dark:text-stone-200 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 hover:text-cyan-700 dark:hover:text-cyan-300 font-medium transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Network className="w-3.5 h-3.5 text-cyan-500" />
                        <span>Visual Mind Map Studio</span>
                      </div>
                      <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 font-bold">P6 Map</span>
                    </button>
                  )}
                  {onOpenMacroAutomation && (
                    <button
                      onClick={() => {
                        setShowToolsMenu(false);
                        onOpenMacroAutomation();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-stone-800 dark:text-stone-200 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-700 dark:hover:text-amber-300 font-medium transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                        <span>Macro Automation Engine</span>
                      </div>
                      <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 font-bold">P7 Macro</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowToolsMenu(false);
                      window.dispatchEvent(new CustomEvent('keepnotes_restore_zen_dock'));
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-stone-800 dark:text-stone-200 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-700 dark:hover:text-amber-300 font-medium transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Zen Focus Dock</span>
                    </div>
                    <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 font-bold">Zen</span>
                  </button>
                  {onOpenSerendipity && (
                    <button
                      onClick={() => {
                        setShowToolsMenu(false);
                        onOpenSerendipity();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-stone-800 dark:text-stone-200 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-700 dark:hover:text-amber-300 font-medium transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Compass className="w-3.5 h-3.5 text-amber-500" />
                        <span>Serendipity Oracle</span>
                      </div>
                      <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 font-bold">Wisdom</span>
                    </button>
                  )}
                  {onOpenActivityHeatmap && (
                    <button
                      onClick={() => {
                        setShowToolsMenu(false);
                        onOpenActivityHeatmap();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-stone-800 dark:text-stone-200 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-700 dark:hover:text-amber-300 font-medium transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Activity className="w-3.5 h-3.5 text-amber-500" />
                        <span>Vault Activity & Heatmap</span>
                      </div>
                      <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 font-bold">52W</span>
                    </button>
                  )}
                  {onOpenFlashcards && (
                    <button
                      onClick={() => {
                        setShowToolsMenu(false);
                        onOpenFlashcards();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-stone-800 dark:text-stone-200 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-700 dark:hover:text-amber-300 font-medium transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-3.5 h-3.5 text-amber-500" />
                        <span>Active Recall & Flashcards</span>
                      </div>
                      <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 font-bold">P8 Recall</span>
                    </button>
                  )}
                  {onOpenPresentationStudio && (
                    <button
                      onClick={() => {
                        setShowToolsMenu(false);
                        onOpenPresentationStudio();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-stone-800 dark:text-stone-200 hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:text-purple-700 dark:hover:text-purple-300 font-medium transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Presentation className="w-3.5 h-3.5 text-purple-500" />
                        <span>Presentation & Slide Deck</span>
                      </div>
                      <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 font-bold">P9 Slides</span>
                    </button>
                  )}
                  {onOpenReactiveSandbox && (
                    <button
                      onClick={() => {
                        setShowToolsMenu(false);
                        onOpenReactiveSandbox();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-stone-800 dark:text-stone-200 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 hover:text-cyan-700 dark:hover:text-cyan-300 font-medium transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Calculator className="w-3.5 h-3.5 text-cyan-500" />
                        <span>Reactive Formulas & Matrix</span>
                      </div>
                      <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 font-bold">P10 Quant</span>
                    </button>
                  )}
                  {onOpenQuickCapture && (
                    <button
                      onClick={() => {
                        setShowToolsMenu(false);
                        onOpenQuickCapture();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-stone-800 dark:text-stone-200 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-700 dark:hover:text-amber-300 font-medium transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                        <span>Quick Capture</span>
                      </div>
                      <kbd className="text-[10px] font-mono text-stone-400">Ctrl+Shift+C</kbd>
                    </button>
                  )}
                  {onOpenTemplates && (
                    <button
                      onClick={() => {
                        setShowToolsMenu(false);
                        onOpenTemplates();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-stone-800 dark:text-stone-200 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-700 dark:hover:text-amber-300 font-medium transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <LayoutTemplate className="w-3.5 h-3.5 text-amber-500" />
                        <span>Templates & Creator</span>
                      </div>
                      <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 font-bold">New</span>
                    </button>
                  )}
                  {onOpenVaultTasks && (
                    <button
                      onClick={() => {
                        setShowToolsMenu(false);
                        onOpenVaultTasks();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-stone-800 dark:text-stone-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <ListTodo className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Tasks & Action Items</span>
                      </div>
                      <kbd className="text-[10px] font-mono text-stone-400">Ctrl+Alt+T</kbd>
                    </button>
                  )}
                  {onOpenNoteCompare && (
                    <button
                      onClick={() => {
                        setShowToolsMenu(false);
                        onOpenNoteCompare();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-stone-800 dark:text-stone-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <GitMerge className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Compare & Merge Notes</span>
                      </div>
                      <kbd className="text-[10px] font-mono text-stone-400">Ctrl+Alt+M</kbd>
                    </button>
                  )}
                </div>

                {/* Vault Security */}
                <div className="py-1.5">
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                    Vault Security & Privacy
                  </div>
                  {onOpenEncryption && (
                    <button
                      onClick={() => {
                        setShowToolsMenu(false);
                        onOpenEncryption();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 font-medium transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Shield className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Encryption & Keys</span>
                      </div>
                    </button>
                  )}
                  {onOpenSecurityAudit && (
                    <button
                      onClick={() => {
                        setShowToolsMenu(false);
                        onOpenSecurityAudit();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 font-medium transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Security Audit</span>
                      </div>
                    </button>
                  )}
                </div>

                {/* Sync & Storage */}
                <div className="py-1.5">
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                    Sync & Storage
                  </div>
                  {onOpenFilesystemBridge && (
                    <button
                      onClick={() => {
                        setShowToolsMenu(false);
                        onOpenFilesystemBridge();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 font-medium transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <FolderSync className="w-3.5 h-3.5 text-amber-500" />
                        <span>Filesystem Bridge</span>
                      </div>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowToolsMenu(false);
                      onOpenSync();
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 font-medium transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <FolderSync className="w-3.5 h-3.5 text-stone-500" />
                      <span>Sync & Backups</span>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setShowToolsMenu(false);
                      onOpenImport();
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 font-medium transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Upload className="w-3.5 h-3.5 text-stone-500" />
                      <span>Import Takeout / Markdown</span>
                    </div>
                  </button>
                </div>

                {/* Diagnostics & Help */}
                <div className="pt-1.5">
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                    Diagnostics & Help
                  </div>
                  {onOpenVaultDoctor && (
                    <button
                      onClick={() => {
                        setShowToolsMenu(false);
                        onOpenVaultDoctor();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 font-medium transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Activity className="w-3.5 h-3.5 text-rose-500" />
                        <span>Vault Doctor</span>
                      </div>
                    </button>
                  )}
                  {onOpenShortcuts && (
                    <button
                      onClick={() => {
                        setShowToolsMenu(false);
                        onOpenShortcuts();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 font-medium transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Keyboard className="w-3.5 h-3.5 text-stone-500" />
                        <span>Keyboard Shortcuts</span>
                      </div>
                      <kbd className="text-[10px] font-mono text-stone-400">Ctrl+/</kbd>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Floating Theme Palette Quick Switcher */}
          <div ref={themePaletteRef} className="relative">
            <button
              id="btn-theme-palette-toggle"
              type="button"
              onClick={() => setShowThemePalette((prev) => !prev)}
              className={`h-8 px-2.5 rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold border ${
                showThemePalette
                  ? 'bg-amber-500 text-stone-950 border-amber-600 shadow-xs ring-2 ring-amber-500/25'
                  : 'text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 border-stone-200/70 dark:border-stone-800'
              }`}
              title="Floating Theme Palette (Quick Cycle Favorite Themes - Alt+T)"
              aria-label="Open Floating Theme Palette"
              aria-expanded={showThemePalette}
              aria-haspopup="dialog"
            >
              <Palette className={`w-3.5 h-3.5 ${showThemePalette ? 'text-stone-950' : 'text-amber-500'} shrink-0`} />
              <div
                className="w-2.5 h-2.5 rounded-full border border-black/15 dark:border-white/20 shadow-2xs shrink-0"
                style={{
                  backgroundColor: currentThemeDef?.accentHex || '#f59e0b',
                }}
              />
              <span className="hidden md:inline text-xs font-medium max-w-[70px] truncate">
                {currentThemeDef?.name?.split(' ')[0] || 'Theme'}
              </span>
            </button>

            <ThemePalettePopover
              isOpen={showThemePalette}
              onClose={() => setShowThemePalette(false)}
              settings={settings}
              onSettingsChange={onSettingsChange}
              onOpenSettings={onOpenSettings}
              onOpenThemeCreator={onOpenThemeCreator}
            />
          </div>

          {/* Ambient Soundscapes Zen Audio */}
          <div ref={soundscapesRef} className="relative">
            <button
              id="btn-ambient-soundscapes"
              type="button"
              onClick={() => setShowSoundscapes((prev) => !prev)}
              className={`w-8 h-8 rounded-xl transition-all flex items-center justify-center border ${
                soundscapeService.getIsPlaying()
                  ? 'bg-amber-500 text-stone-950 border-amber-600 shadow-xs ring-2 ring-amber-500/25'
                  : showSoundscapes
                  ? 'bg-stone-200 dark:bg-stone-800 text-stone-900 dark:text-stone-100 border-stone-300 dark:border-stone-700'
                  : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 border-stone-200/70 dark:border-stone-800'
              }`}
              title={soundscapeService.getIsPlaying() ? 'Zen Soundscape: Playing (Click to configure)' : 'Zen Focus Ambient Soundscapes'}
              aria-label="Zen Focus Ambient Soundscapes"
            >
              <Headphones className="w-3.5 h-3.5" />
            </button>

            <AmbientSoundscapesPopover
              isOpen={showSoundscapes}
              onClose={() => setShowSoundscapes(false)}
            />
          </div>

          {/* Theme Toggle */}
          <button
            id="btn-theme-toggle"
            onClick={toggleTheme}
            className="w-8 h-8 p-1.5 rounded-xl text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors flex items-center justify-center border border-stone-200/70 dark:border-stone-800"
            title={isDarkActive ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label={isDarkActive ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkActive ? (
              <Sun className="w-4 h-4 text-amber-400 stroke-[2.25]" />
            ) : (
              <Moon className="w-4 h-4 text-stone-700 stroke-[2.25]" />
            )}
          </button>

          {/* Settings Button */}
          <button
            id="btn-open-settings"
            onClick={onOpenSettings}
            className="w-8 h-8 p-1.5 rounded-xl text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors flex items-center justify-center border border-stone-200/70 dark:border-stone-800"
            title="Settings"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* New Note Button */}
          <button
            id="btn-header-new-note"
            onClick={() => onOpenNewNote('text')}
            className="h-8 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs active:scale-95 transition-all shrink-0"
            title="Create New Note (Ctrl+N)"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline">Note</span>
          </button>
        </div>
      </div>
    </header>
  );
};
