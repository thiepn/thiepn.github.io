import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Palette,
  ChevronLeft,
  ChevronRight,
  Star,
  Check,
  Plus,
  Settings,
  Search,
  Sun,
  Moon,
  Wand2,
  X,
  RotateCw,
} from 'lucide-react';
import { AppSettings, ThemeMode, CustomTheme, AccentColorKey } from '../types';
import {
  getAllThemes,
  isDarkTheme,
  ACCENT_LIST,
  ThemeDefinition,
} from '../utils/themes';
import { a11yAnnouncer } from '../utils/a11y';

interface ThemePalettePopoverProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSettingsChange: (newSettings: Partial<AppSettings>) => void;
  onOpenSettings?: () => void;
  onOpenThemeCreator?: (theme?: CustomTheme | null) => void;
}

const STORAGE_FAVORITES_KEY = 'open_notes_favorite_themes';
const DEFAULT_FAVORITES: string[] = [
  'light',
  'dark',
  'cyberpunk',
  'nordic',
  'forest',
  'sunset',
  'sakura',
  'dracula',
  'sepia',
  'monokai',
];

export const ThemePalettePopover: React.FC<ThemePalettePopoverProps> = ({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
  onOpenSettings,
  onOpenThemeCreator,
}) => {
  const [favoriteThemeIds, setFavoriteThemeIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_FAVORITES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    return DEFAULT_FAVORITES;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<
    'favorites' | 'all' | 'dark' | 'light' | 'custom'
  >('favorites');

  const popoverRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync favorites with storage
  const toggleFavorite = (themeId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setFavoriteThemeIds((prev) => {
      const isFav = prev.includes(themeId);
      const updated = isFav ? prev.filter((id) => id !== themeId) : [...prev, themeId];
      try {
        localStorage.setItem(STORAGE_FAVORITES_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      a11yAnnouncer.announce(
        isFav ? `Removed theme from favorites` : `Added theme to favorites`
      );
      return updated;
    });
  };

  // Compute all available themes
  const allThemes: ThemeDefinition[] = useMemo(() => {
    return getAllThemes(settings.customThemes);
  }, [settings.customThemes]);

  // List of active favorite themes
  const favoriteThemes = useMemo(() => {
    const list = allThemes.filter((t) => favoriteThemeIds.includes(t.id));
    // If no favorites are selected, fall back to core themes
    if (list.length === 0) {
      return allThemes.filter((t) => ['light', 'dark', 'cyberpunk', 'forest'].includes(t.id));
    }
    return list;
  }, [allThemes, favoriteThemeIds]);

  // Current theme definition
  const currentThemeDef = useMemo(() => {
    return allThemes.find((t) => t.id === settings.theme) || allThemes[0];
  }, [allThemes, settings.theme]);

  // Current index in favorite list
  const currentFavoriteIndex = useMemo(() => {
    return favoriteThemes.findIndex((t) => t.id === settings.theme);
  }, [favoriteThemes, settings.theme]);

  // Quick Cycle: Next Favorite Theme
  const cycleNextTheme = () => {
    if (favoriteThemes.length === 0) return;
    const nextIdx =
      currentFavoriteIndex >= 0
        ? (currentFavoriteIndex + 1) % favoriteThemes.length
        : 0;
    const nextTheme = favoriteThemes[nextIdx];
    if (nextTheme) {
      onSettingsChange({ theme: nextTheme.id });
      a11yAnnouncer.announce(`Switched theme to ${nextTheme.name}`);
    }
  };

  // Quick Cycle: Previous Favorite Theme
  const cyclePrevTheme = () => {
    if (favoriteThemes.length === 0) return;
    const prevIdx =
      currentFavoriteIndex >= 0
        ? (currentFavoriteIndex - 1 + favoriteThemes.length) % favoriteThemes.length
        : favoriteThemes.length - 1;
    const prevTheme = favoriteThemes[prevIdx];
    if (prevTheme) {
      onSettingsChange({ theme: prevTheme.id });
      a11yAnnouncer.announce(`Switched theme to ${prevTheme.name}`);
    }
  };

  // Filtered themes for list
  const displayedThemes = useMemo(() => {
    let list = allThemes;

    if (categoryFilter === 'favorites') {
      list = list.filter((t) => favoriteThemeIds.includes(t.id));
    } else if (categoryFilter === 'dark') {
      list = list.filter((t) => t.isDark);
    } else if (categoryFilter === 'light') {
      list = list.filter((t) => !t.isDark);
    } else if (categoryFilter === 'custom') {
      list = list.filter((t) => t.isCustom);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.tagline.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q)
      );
    }

    return list;
  }, [allThemes, categoryFilter, favoriteThemeIds, searchQuery]);

  // Focus trap / ESC to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.altKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        if (e.shiftKey) {
          cyclePrevTheme();
        } else {
          cycleNextTheme();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, cycleNextTheme, cyclePrevTheme, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={popoverRef}
      id="theme-palette-popover"
      role="dialog"
      aria-label="Theme Palette Quick Switcher"
      className="absolute right-0 top-full mt-2 w-[340px] sm:w-[400px] bg-white/95 dark:bg-stone-900/95 backdrop-blur-xl border border-stone-300/80 dark:border-stone-700/80 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]"
    >
      {/* 1. Header / Quick Cycler Banner */}
      <div className="p-3 border-b border-stone-200/80 dark:border-stone-800/80 bg-stone-50/70 dark:bg-stone-950/40">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5">
            <Palette className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="text-xs font-bold text-stone-900 dark:text-stone-100 tracking-tight">
              Theme Palette
            </span>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[10px] text-stone-600 dark:text-stone-300 font-mono bg-stone-200/60 dark:bg-stone-800 px-1.5 py-0.5 rounded border border-stone-300/60 dark:border-stone-700">
              Alt+T to cycle
            </span>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/50 dark:hover:bg-stone-800 transition-colors"
              title="Close Palette (Esc)"
              aria-label="Close Theme Palette"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Favorite Themes Carousel / Quick Stepper */}
        <div className="flex items-center justify-between gap-2 bg-white dark:bg-stone-900 p-2 rounded-xl border border-stone-200 dark:border-stone-800 shadow-2xs">
          <button
            type="button"
            onClick={cyclePrevTheme}
            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors shrink-0"
            title="Previous Favorite Theme (Alt+Shift+T)"
            aria-label="Previous Favorite Theme"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Active Theme Preview Pill */}
          <div className="flex items-center gap-2 min-w-0 flex-1 justify-center text-center px-1">
            <div
              className="w-5 h-5 rounded-md border shadow-2xs flex items-center justify-center shrink-0 relative overflow-hidden"
              style={{
                backgroundColor: currentThemeDef?.bgHex || '#ffffff',
                borderColor: currentThemeDef?.borderHex || '#e2dfd7',
              }}
            >
              <div
                className="w-2.5 h-2.5 rounded-xs"
                style={{ backgroundColor: currentThemeDef?.cardHex || '#ffffff' }}
              />
              <div
                className="w-1.5 h-1.5 rounded-full absolute bottom-0.5 right-0.5"
                style={{ backgroundColor: currentThemeDef?.accentHex || '#f59e0b' }}
              />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate flex items-center gap-1 justify-center">
                <span>{currentThemeDef?.name || 'Studio Light'}</span>
                {currentThemeDef?.isDark ? (
                  <Moon className="w-3 h-3 text-amber-400 shrink-0 inline" />
                ) : (
                  <Sun className="w-3 h-3 text-amber-500 shrink-0 inline" />
                )}
              </div>
              <div className="text-[10px] text-stone-600 dark:text-stone-300 font-medium">
                {currentFavoriteIndex >= 0
                  ? `Favorite ${currentFavoriteIndex + 1} of ${favoriteThemes.length}`
                  : `${favoriteThemes.length} Favorites saved`}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={cycleNextTheme}
            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors shrink-0"
            title="Next Favorite Theme (Alt+T)"
            aria-label="Next Favorite Theme"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Favorite Themes Fast-Tap Swatch Strip */}
        {favoriteThemes.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1 scrollbar-thin">
            {favoriteThemes.map((fav) => {
              const isCurrent = settings.theme === fav.id;
              return (
                <button
                  key={fav.id}
                  type="button"
                  onClick={() => {
                    onSettingsChange({ theme: fav.id });
                    a11yAnnouncer.announce(`Applied theme ${fav.name}`);
                  }}
                  className={`group relative p-1 rounded-lg border transition-all shrink-0 flex items-center gap-1 text-[11px] font-semibold ${
                    isCurrent
                      ? 'border-amber-500 ring-2 ring-amber-500/40 bg-amber-50/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200'
                      : 'border-stone-200 dark:border-stone-800 hover:border-stone-400 dark:hover:border-stone-700 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300'
                  }`}
                  title={`${fav.name} (${fav.isDark ? 'Dark' : 'Light'})`}
                  aria-label={`Switch to ${fav.name}`}
                >
                  <div
                    className="w-3.5 h-3.5 rounded-full border shadow-2xs shrink-0"
                    style={{
                      backgroundColor: fav.bgHex,
                      borderColor: fav.borderHex,
                    }}
                  />
                  <span className="truncate max-w-[70px]">{fav.name.split(' ')[0]}</span>
                  {isCurrent && (
                    <Check className="w-3 h-3 text-amber-500 shrink-0 stroke-[2.5]" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Filter & Search Controls */}
      <div className="px-3 pt-2.5 pb-2 border-b border-stone-200/80 dark:border-stone-800/80 space-y-2">
        <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800/70 p-1 rounded-xl">
          <Search className="w-3.5 h-3.5 text-stone-400 ml-1.5 shrink-0" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search themes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-xs font-medium text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none px-1 py-0.5"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              title="Clear search"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center justify-between gap-1 overflow-x-auto scrollbar-none text-[11px]">
          {(
            [
              { id: 'favorites', label: 'Favorites', count: favoriteThemeIds.length },
              { id: 'all', label: 'All', count: allThemes.length },
              { id: 'dark', label: 'Dark', count: allThemes.filter((t) => t.isDark).length },
              { id: 'light', label: 'Light', count: allThemes.filter((t) => !t.isDark).length },
              {
                id: 'custom',
                label: 'Custom',
                count: allThemes.filter((t) => t.isCustom).length,
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCategoryFilter(tab.id)}
              className={`px-2 py-1 rounded-lg font-semibold transition-colors shrink-0 flex items-center gap-1 ${
                categoryFilter === tab.id
                  ? 'bg-amber-500 text-white shadow-2xs'
                  : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[9px] px-1 py-0.2 rounded-full font-mono ${
                  categoryFilter === tab.id
                    ? 'bg-white/25 text-white'
                    : 'bg-stone-200 dark:bg-stone-800 text-stone-500 dark:text-stone-400'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Theme Grid List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 max-h-[260px] scrollbar-thin">
        {displayedThemes.length === 0 ? (
          <div className="text-center py-8 px-4 text-stone-400">
            <Palette className="w-6 h-6 mx-auto mb-1.5 opacity-60" />
            <p className="text-xs font-medium">No themes found</p>
            {categoryFilter === 'favorites' && (
              <p className="text-[11px] text-stone-500 mt-1">
                Star themes below or in &ldquo;All&rdquo; tab to pin them to your favorites carousel.
              </p>
            )}
          </div>
        ) : (
          displayedThemes.map((t) => {
            const isSelected = settings.theme === t.id;
            const isFavorite = favoriteThemeIds.includes(t.id);

            return (
              <div
                key={t.id}
                onClick={() => {
                  onSettingsChange({ theme: t.id });
                  a11yAnnouncer.announce(`Applied theme ${t.name}`);
                }}
                className={`p-2 rounded-xl border text-left transition-all relative flex items-center justify-between gap-2.5 cursor-pointer group ${
                  isSelected
                    ? 'border-amber-500 ring-2 ring-amber-500/40 shadow-xs bg-amber-50/60 dark:bg-amber-950/30'
                    : 'border-stone-200/80 dark:border-stone-800/80 hover:border-stone-400 dark:hover:border-stone-700 bg-white dark:bg-stone-900/90'
                }`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSettingsChange({ theme: t.id });
                  }
                }}
                aria-pressed={isSelected}
              >
                {/* Visual Theme Preview Box */}
                <div
                  className="w-8 h-8 rounded-lg border shadow-2xs flex items-center justify-center shrink-0 relative overflow-hidden"
                  style={{ backgroundColor: t.bgHex, borderColor: t.borderHex }}
                >
                  <div
                    className="w-4 h-4 rounded-xs border shadow-2xs"
                    style={{ backgroundColor: t.cardHex, borderColor: t.borderHex }}
                  />
                  <div
                    className="w-2 h-2 rounded-full absolute bottom-0.5 right-0.5 shadow-2xs"
                    style={{ backgroundColor: t.accentHex }}
                  />
                </div>

                {/* Theme Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                      {t.name}
                    </span>
                    {t.isCustom && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                        Custom
                      </span>
                    )}
                    {t.isDark ? (
                      <Moon className="w-2.5 h-2.5 text-stone-400 shrink-0" />
                    ) : (
                      <Sun className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-[10px] text-stone-500 dark:text-stone-400 truncate">
                    {t.tagline}
                  </p>
                </div>

                {/* Star Favorite & Selected Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => toggleFavorite(t.id, e)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      isFavorite
                        ? 'text-amber-500 hover:text-amber-600 dark:hover:text-amber-400 bg-amber-100/50 dark:bg-amber-950/40'
                        : 'text-stone-300 dark:text-stone-600 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-stone-100 dark:hover:bg-stone-800 opacity-60 group-hover:opacity-100'
                    }`}
                    title={isFavorite ? 'Remove from favorites' : 'Pin to favorites carousel'}
                    aria-label={isFavorite ? `Unfavorite ${t.name}` : `Favorite ${t.name}`}
                  >
                    <Star
                      className={`w-3.5 h-3.5 ${isFavorite ? 'fill-amber-500 stroke-amber-500' : ''}`}
                    />
                  </button>

                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 4. Quick Accent Color Strip */}
      <div className="px-3 py-2 border-t border-stone-200/80 dark:border-stone-800/80 bg-stone-50/50 dark:bg-stone-950/30">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
            Accent Highlight
          </span>
          <span className="text-[10px] text-stone-400 capitalize">
            {settings.accentColor || 'amber'}
          </span>
        </div>
        <div className="flex items-center justify-between gap-1">
          {ACCENT_LIST.map((accent) => {
            const isSelected = (settings.accentColor || 'amber') === accent.id;
            return (
              <button
                key={accent.id}
                type="button"
                onClick={() => {
                  onSettingsChange({ accentColor: accent.id });
                  a11yAnnouncer.announce(`Accent color changed to ${accent.name}`);
                }}
                className={`w-5 h-5 rounded-full transition-transform shrink-0 flex items-center justify-center ${
                  isSelected
                    ? 'ring-2 ring-offset-2 ring-stone-900 dark:ring-white scale-110'
                    : 'hover:scale-105 opacity-80 hover:opacity-100'
                }`}
                style={{ backgroundColor: accent.hex }}
                title={accent.name}
                aria-label={`Select ${accent.name} accent`}
              >
                {isSelected && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Footer Quick Links */}
      <div className="p-2 border-t border-stone-200/80 dark:border-stone-800/80 bg-stone-100/70 dark:bg-stone-950/60 flex items-center justify-between gap-2 text-xs">
        {onOpenThemeCreator ? (
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenThemeCreator(null);
            }}
            className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 border border-stone-300 dark:border-stone-700 font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5 text-amber-500 stroke-[2.5]" />
            <span>Create Theme</span>
          </button>
        ) : (
          <span />
        )}

        {onOpenSettings && (
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenSettings();
            }}
            className="px-2.5 py-1.5 rounded-xl text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200/60 dark:hover:bg-stone-800 font-medium flex items-center gap-1.5 transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>All Settings</span>
          </button>
        )}
      </div>
    </div>
  );
};
