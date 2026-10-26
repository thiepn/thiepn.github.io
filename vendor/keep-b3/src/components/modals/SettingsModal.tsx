import React, { useEffect, useState } from 'react';
import {
  Settings as SettingsIcon,
  Moon,
  Sun,
  LayoutGrid,
  Palette,
  Columns,
  Maximize2,
  Minimize2,
  Calendar,
  Trash2,
  X,
  Check,
  Keyboard,
  Activity,
  ShieldCheck,
  Radio,
  Bookmark,
  UploadCloud,
  Puzzle,
  Sparkles,
  SlidersHorizontal,
  Layers,
  Flame,
  Zap,
  Leaf,
  Terminal,
  Clock,
  Eye,
  Wand2,
  Edit3,
  Plus,
} from 'lucide-react';
import { AppSettings, CanvasBackground, ThemeMode, ViewMode, AccentColorKey, CustomTheme } from '../../types';
import { THEME_LIST, ACCENT_LIST, CANVAS_TEXTURES, ThemeDefinition, getAllThemes } from '../../utils/themes';
import { DesktopSettingsCard } from '../../pkm/desktop/ui/DesktopSettingsCard';
import { MobileSettingsCard } from '../../pkm/mobile/ui/MobileSettingsCard';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onClearAllNotes: () => void;
  totalNotesCount: number;
  onOpenThemeCreator?: (theme?: CustomTheme | null) => void;
  onDeleteCustomTheme?: (themeId: string) => void;
  onOpenShortcuts?: () => void;
  onOpenVaultDoctor?: () => void;
  onOpenEncryption?: () => void;
  onOpenRecoveryCenter?: () => void;
  onOpenDeviceSync?: () => void;
  onOpenExtensionSettings?: () => void;
  onOpenMigrationHub?: () => void;
  onOpenPluginManager?: () => void;
  onOpenAISettings?: () => void;
  onOpenFilesystemBridge?: () => void;
  onOpenDesktopDiagnostics?: () => void;
  onOpenMobileDiagnostics?: () => void;
  onOpenMobileShareInbox?: () => void;
  onOpenPersonalization?: () => void;
  onOpenIntegrationsHub?: () => void;
  onOpenV2Migration?: () => void;
  onOpenV2ModuleLauncher?: () => void;
  isVaultLocked?: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onClearAllNotes,
  totalNotesCount,
  onOpenThemeCreator,
  onDeleteCustomTheme,
  onOpenShortcuts,
  onOpenVaultDoctor,
  onOpenEncryption,
  onOpenRecoveryCenter,
  onOpenDeviceSync,
  onOpenExtensionSettings,
  onOpenMigrationHub,
  onOpenPluginManager,
  onOpenAISettings,
  onOpenFilesystemBridge,
  onOpenDesktopDiagnostics,
  onOpenMobileDiagnostics,
  onOpenMobileShareInbox,
  onOpenPersonalization,
  onOpenIntegrationsHub,
  onOpenV2Migration,
  onOpenV2ModuleLauncher,
  isVaultLocked,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const [themeCategory, setThemeCategory] = useState<'all' | 'custom' | 'core' | 'vibrant' | 'nature' | 'retro' | 'hacker'>('all');

  if (!isOpen) return null;

  const allThemes = getAllThemes(settings.customThemes);
  const customCount = settings.customThemes?.length || 0;

  const filteredThemes = allThemes.filter(
    (t) => themeCategory === 'all' || t.category === themeCategory
  );

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden flex flex-col p-6 space-y-6 max-h-[85vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base">
                Appearance & Customization Studio
              </h3>
              <p className="text-xs text-stone-400">
                14 vibrant themes, bespoke Custom Themes, luminous accents & card aesthetics
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. Theme Mode & Categories */}
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-amber-500" />
              <label className="text-xs font-bold text-stone-800 dark:text-stone-200 uppercase tracking-wider">
                Theme Presets & Custom Palettes ({allThemes.length})
              </label>
            </div>

            <div className="flex items-center gap-2">
              {onOpenThemeCreator && (
                <button
                  type="button"
                  onClick={() => onOpenThemeCreator(null)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-xs flex items-center gap-1 transition-all active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Create Custom Theme</span>
                </button>
              )}

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800/80 p-0.5 rounded-lg text-[10px]">
                {(['all', 'custom', 'core', 'vibrant', 'nature', 'retro', 'hacker'] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setThemeCategory(cat)}
                    className={`px-2 py-0.5 rounded-md font-medium capitalize transition-all flex items-center gap-1 ${
                      themeCategory === cat
                        ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs'
                        : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                    }`}
                  >
                    <span>{cat}</span>
                    {cat === 'custom' && customCount > 0 && (
                      <span className="w-4 h-4 rounded-full bg-amber-500 text-stone-950 font-bold text-[9px] flex items-center justify-center">
                        {customCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Themes Grid */}
          {filteredThemes.length === 0 && themeCategory === 'custom' ? (
            <div className="p-6 rounded-xl border border-dashed border-stone-300 dark:border-stone-700 text-center space-y-2 bg-stone-50/50 dark:bg-stone-950/40">
              <Wand2 className="w-7 h-7 mx-auto text-amber-500 opacity-80" />
              <p className="text-xs font-medium text-stone-700 dark:text-stone-300">
                No custom themes created yet.
              </p>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 max-w-sm mx-auto">
                Design custom palettes by choosing your own primary, background, and accent colors.
              </p>
              {onOpenThemeCreator && (
                <button
                  type="button"
                  onClick={() => onOpenThemeCreator(null)}
                  className="mt-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 text-stone-950 hover:bg-amber-400 shadow-xs inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Launch Theme Creator</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
              {filteredThemes.map((t) => {
                const isSelected = settings.theme === t.id;
                const customObj = t.isCustom
                  ? settings.customThemes?.find((ct) => ct.id === t.id)
                  : null;

                return (
                  <div
                    key={t.id}
                    onClick={() => onUpdateSettings({ ...settings, theme: t.id })}
                    className={`p-2.5 rounded-xl border text-left transition-all relative overflow-hidden flex items-center justify-between gap-3 cursor-pointer ${
                      isSelected
                        ? 'border-amber-500 ring-2 ring-amber-500/50 shadow-md bg-stone-50 dark:bg-stone-800/60'
                        : 'border-stone-200 dark:border-stone-800 hover:border-stone-400 dark:hover:border-stone-700 bg-white dark:bg-stone-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Visual Color Palette Swatch */}
                      <div
                        className="w-8 h-8 rounded-lg border shadow-xs flex items-center justify-center shrink-0 relative overflow-hidden"
                        style={{ backgroundColor: t.bgHex, borderColor: t.borderHex }}
                      >
                        <div
                          className="w-4 h-4 rounded-sm border shadow-xs"
                          style={{ backgroundColor: t.cardHex, borderColor: t.borderHex }}
                        />
                        <div
                          className="w-2 h-2 rounded-full absolute bottom-0.5 right-0.5 shadow-xs"
                          style={{ backgroundColor: t.accentHex }}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-xs text-stone-900 dark:text-stone-100 truncate">
                            {t.name}
                          </span>
                          {t.isCustom && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 font-mono font-semibold">
                              Custom
                            </span>
                          )}
                          {t.isDark && !t.isCustom && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300 font-mono">
                              Dark
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-stone-400 truncate">{t.tagline}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {t.isCustom && customObj && onOpenThemeCreator && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenThemeCreator(customObj);
                          }}
                          className="p-1 rounded-md text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                          title="Edit Custom Theme"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {t.isCustom && onDeleteCustomTheme && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete custom theme "${t.name}"?`)) {
                              onDeleteCustomTheme(t.id);
                            }
                          }}
                          className="p-1 rounded-md text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                          title="Delete Custom Theme"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. Accent Color Palette */}
        <div className="space-y-2 pt-2 border-t border-stone-100 dark:border-stone-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <label className="text-xs font-bold text-stone-800 dark:text-stone-200 uppercase tracking-wider">
                Accent Glow Color
              </label>
            </div>
            <span className="text-[11px] text-stone-400">
              Active: {ACCENT_LIST.find((a) => a.id === (settings.accentColor || 'amber'))?.name || 'Golden Amber'}
            </span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {ACCENT_LIST.map((accent) => {
              const isSelected = (settings.accentColor || 'amber') === accent.id;
              return (
                <button
                  key={accent.id}
                  onClick={() => onUpdateSettings({ ...settings, accentColor: accent.id })}
                  title={accent.name}
                  className={`w-7 h-7 rounded-full transition-all flex items-center justify-center shrink-0 relative ${
                    isSelected ? 'ring-2 ring-offset-2 ring-stone-900 dark:ring-white scale-110' : 'hover:scale-105 opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: accent.hex }}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3] drop-shadow-xs" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Canvas Background Texture */}
        <div className="space-y-2 pt-2 border-t border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-500" />
            <label className="text-xs font-bold text-stone-800 dark:text-stone-200 uppercase tracking-wider">
              Canvas Background Patterns ({CANVAS_TEXTURES.length})
            </label>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-44 overflow-y-auto pr-1">
            {CANVAS_TEXTURES.map((bg) => (
              <button
                key={bg.id}
                onClick={() => onUpdateSettings({ ...settings, canvasBackground: bg.id })}
                className={`p-2.5 rounded-xl border text-left space-y-0.5 transition-all ${
                  settings.canvasBackground === bg.id
                    ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 text-amber-950 dark:text-amber-100 ring-1 ring-amber-500 shadow-xs'
                    : 'border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs">{bg.label}</span>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-stone-100 dark:bg-stone-800 text-stone-500 font-mono">
                    {bg.badge}
                  </span>
                </div>
                <p className="text-[10px] text-stone-400 leading-tight truncate">{bg.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* 4. Visual Card Styles & Glow Toggles */}
        <div className="space-y-2 pt-2 border-t border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-amber-500" />
            <label className="text-xs font-bold text-stone-800 dark:text-stone-200 uppercase tracking-wider">
              Card Aesthetics & Glow Effects
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label className="flex items-center justify-between p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800/40">
              <div className="space-y-0.5 pr-2">
                <span className="text-xs font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  Note Card Glow on Hover
                </span>
                <p className="text-[10px] text-stone-400">
                  Luminous aura matching note color when hovering
                </p>
              </div>
              <input
                type="checkbox"
                checked={!!settings.cardGlow}
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    cardGlow: e.target.checked,
                  })
                }
                className="w-4 h-4 rounded text-amber-500 accent-amber-500"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800/40">
              <div className="space-y-0.5 pr-2">
                <span className="text-xs font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-pink-500" />
                  Vibrant Saturated Mode
                </span>
                <p className="text-[10px] text-stone-400">
                  Amplified high-contrast badge colors & borders
                </p>
              </div>
              <input
                type="checkbox"
                checked={!!settings.vibrantMode}
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    vibrantMode: e.target.checked,
                  })
                }
                className="w-4 h-4 rounded text-amber-500 accent-amber-500"
              />
            </label>
          </div>
        </div>

        {/* 3. Layout Grid Columns & Density */}
        <div className="space-y-3 pt-2 border-t border-stone-100 dark:border-stone-800">
          <label className="flex items-center justify-between p-3 rounded-xl border border-stone-200 dark:border-stone-800 cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800/40">
            <div className="space-y-0.5 pr-2">
              <span className="text-xs font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                <Minimize2 className="w-3.5 h-3.5 text-amber-500" />
                Compact Mode
              </span>
              <p className="text-[11px] text-stone-400">
                Reduces vertical padding in the note feed and sidebar for higher information density
              </p>
            </div>
            <input
              type="checkbox"
              id="toggle-compact-mode"
              checked={Boolean(settings.compactMode)}
              onChange={(e) =>
                onUpdateSettings({
                  ...settings,
                  compactMode: e.target.checked,
                })
              }
              className="w-4 h-4 rounded text-amber-500 accent-amber-500"
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Columns */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-800 dark:text-stone-200 uppercase tracking-wider">
                Grid Columns
              </label>
              <select
                value={settings.gridColumns}
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    gridColumns: e.target.value as any,
                  })
                }
                className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-800 text-xs bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 focus:outline-none"
              >
                <option value="auto">Auto (Responsive width)</option>
                <option value="2">2 Columns</option>
                <option value="3">3 Columns</option>
                <option value="4">4 Columns</option>
                <option value="5">5 Columns</option>
              </select>
            </div>

            {/* Density */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-800 dark:text-stone-200 uppercase tracking-wider">
                Card Density
              </label>
              <select
                value={settings.cardDensity}
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    cardDensity: e.target.value as any,
                  })
                }
                className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-800 text-xs bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 focus:outline-none"
              >
                <option value="compact">Compact (Dense cards)</option>
                <option value="comfortable">Comfortable (Standard Keep)</option>
                <option value="spacious">Spacious (Large text padding)</option>
              </select>
            </div>
          </div>
        </div>

        {/* 4. Typography & Font Choice */}
        <div className="space-y-2 pt-2 border-t border-stone-100 dark:border-stone-800">
          <label className="text-xs font-bold text-stone-800 dark:text-stone-200 uppercase tracking-wider">
            Typography Style
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'sans', label: 'Modern Sans', sample: 'Plus Jakarta' },
              { id: 'serif', label: 'Editorial Serif', sample: 'Lora' },
              { id: 'mono', label: 'Monospace', sample: 'JetBrains' },
              { id: 'handwriting', label: 'Handwritten', sample: 'Caveat' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => onUpdateSettings({ ...settings, fontFamily: f.id as any })}
                className={`p-2.5 rounded-xl border text-left space-y-0.5 transition-all ${
                  settings.fontFamily === f.id
                    ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 text-amber-950 dark:text-amber-100 ring-1 ring-amber-500'
                    : 'border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800'
                }`}
              >
                <div className="text-xs font-semibold">{f.label}</div>
                <div className="text-[10px] text-stone-400 font-normal">{f.sample}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 4. Timeline & Browsing Toggles */}
        <div className="space-y-3 pt-2 border-t border-stone-100 dark:border-stone-800">
          <label className="text-xs font-bold text-stone-800 dark:text-stone-200 uppercase tracking-wider">
            Timeline & Navigation
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl border border-stone-200 dark:border-stone-800 cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800/40">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                Show Month Dividers in Masonry
              </span>
              <p className="text-[11px] text-stone-400">
                Groups notes by Year/Month headers with timeline scrubber jumps
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.showMonthDividers}
              onChange={(e) =>
                onUpdateSettings({
                  ...settings,
                  showMonthDividers: e.target.checked,
                })
              }
              className="w-4 h-4 rounded text-amber-500 accent-amber-500"
            />
          </label>

          {onOpenEncryption && (
            <div className="flex items-center justify-between p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                  <SettingsIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Full Vault Client-Side Encryption
                </span>
                <p className="text-[11px] text-stone-400">
                  AES-256-GCM + Argon2id authenticated encryption at rest, auto-lock, and encrypted .vault export
                </p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onOpenEncryption();
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
              >
                Security Center
              </button>
            </div>
          )}

          {onOpenRecoveryCenter && (
            <div className="flex items-center justify-between p-3 rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/40 dark:bg-indigo-950/20">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Data Resilience & Recovery Points
                </span>
                <p className="text-[11px] text-stone-400">
                  Manage recovery snapshots, external backups, emergency export, and journal history
                </p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onOpenRecoveryCenter();
                }}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
              >
                Recovery Center
              </button>
            </div>
          )}

          {onOpenExtensionSettings && (
            <div className="flex items-center justify-between p-3 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                  <Bookmark className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  Browser Extension & Web Clipper
                </span>
                <p className="text-[11px] text-stone-400">
                  Pair browser extension, manage secret tokens, and configure universal web clipping
                </p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onOpenExtensionSettings();
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
              >
                Configure Extension
              </button>
            </div>
          )}

          {onOpenDeviceSync && (
            <div className="flex items-center justify-between p-3 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  P2P Device Sync (Experimental)
                </span>
                <p className="text-[11px] text-stone-400">
                  Direct encrypted WebRTC synchronization between your personal devices
                </p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onOpenDeviceSync();
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
              >
                Device Sync
              </button>
            </div>
          )}

          {onOpenMigrationHub && (
            <div className="flex items-center justify-between p-3 rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/40 dark:bg-indigo-950/20">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                  <UploadCloud className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Universal Import & Migration Hub
                </span>
                <p className="text-[11px] text-stone-400">
                  Migrate notes, whiteboards, attachments & Wikilinks from Obsidian, Notion, Evernote, and Joplin
                </p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onOpenMigrationHub();
                }}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
              >
                Open Hub
              </button>
            </div>
          )}

          {onOpenFilesystemBridge && (
            <div className="flex items-center justify-between p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                  <Bookmark className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Filesystem Vault Bridge
                </span>
                <p className="text-[11px] text-stone-400">
                  Mirror vault to external folder on disk for Obsidian & VS Code external live editing
                </p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onOpenFilesystemBridge();
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
              >
                Folder Bridge
              </button>
            </div>
          )}

          {onOpenPluginManager && (
            <div className="flex items-center justify-between p-3 rounded-xl border border-purple-200 dark:border-purple-900/50 bg-purple-50/40 dark:bg-purple-950/20">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                  <Puzzle className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  Plugins & Extensions
                </span>
                <p className="text-[11px] text-stone-400">
                  Manage sandboxed plugins, developer tools, custom views, and command extensions
                </p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onOpenPluginManager();
                }}
                className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
              >
                Manage Plugins
              </button>
            </div>
          )}

          {onOpenIntegrationsHub && (
            <div className="flex items-center justify-between p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Integrations & Connectors
                </span>
                <p className="text-[11px] text-stone-400">
                  Connect GitHub, Google Calendar, Outlook, Readwise highlights, RSS feeds, and REST webhooks
                </p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onOpenIntegrationsHub();
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
              >
                Manage Integrations
              </button>
            </div>
          )}

          {onOpenV2Migration && (
            <div className="flex items-center justify-between p-3 rounded-xl border border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/60 dark:bg-emerald-950/30">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Upgrade to Foundation System
                </span>
                <p className="text-[11px] text-stone-400">
                  8-phase verified migration with SHA-256 cryptographic parity and zero data loss
                </p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onOpenV2Migration();
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
              >
                V2 Migration
              </button>
            </div>
          )}

          {onOpenV2ModuleLauncher && (
            <div className="flex items-center justify-between p-3 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/40 dark:bg-blue-950/20">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  Modular Life Domains
                </span>
                <p className="text-[11px] text-stone-400">
                  Toggle People, Tracking, Learning, Library, Finance, Health, Travel, and Assets
                </p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onOpenV2ModuleLauncher();
                }}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
              >
                Manage Domains
              </button>
            </div>
          )}

          {onOpenPersonalization && (
            <div className="flex items-center justify-between p-3 rounded-xl border border-amber-300 dark:border-amber-800/80 bg-amber-100/50 dark:bg-amber-950/30">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  Personalization & Workflow Quality
                </span>
                <p className="text-[11px] text-stone-400">
                  Customize domain visibility, navigation order, workspace presets, home layout, keyboard shortcuts, and quality templates
                </p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onOpenPersonalization();
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
              >
                Customize
              </button>
            </div>
          )}

          {onOpenAISettings && (
            <div className="flex items-center justify-between p-3 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  AI Knowledge Copilot
                </span>
                <p className="text-[11px] text-stone-400">
                  Configure local simulation or external OpenAI/OpenRouter providers, RAG parameters, and privacy modes
                </p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onOpenAISettings();
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
              >
                AI Settings
              </button>
            </div>
          )}

          {onOpenVaultDoctor && (
            <div className="flex items-center justify-between p-3 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  Vault Doctor & Diagnostics
                </span>
                <p className="text-[11px] text-stone-400">
                  Scan for broken links, orphan notes, tag casing issues, and inspect storage quota
                </p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onOpenVaultDoctor();
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
              >
                Launch Doctor
              </button>
            </div>
          )}

          {onOpenShortcuts && (
            <div className="flex items-center justify-between p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-800/40">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                  <Keyboard className="w-3.5 h-3.5 text-amber-500" />
                  Keyboard Shortcuts
                </span>
                <p className="text-[11px] text-stone-400">
                  Quick hotkeys: Ctrl+N (New Note), Ctrl+F (Search), Esc (Close)
                </p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onOpenShortcuts();
                }}
                className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-xs font-semibold text-stone-700 dark:text-stone-200 transition-colors"
              >
                View Guide
              </button>
            </div>
          )}
        </div>

        {/* Desktop & Native OS Integration Card */}
        <DesktopSettingsCard onOpenDiagnostics={onOpenDesktopDiagnostics} />

        {/* Mobile & OS Integration Card */}
        <MobileSettingsCard
          onOpenDiagnostics={onOpenMobileDiagnostics}
          onOpenShareInbox={onOpenMobileShareInbox}
          isVaultLocked={isVaultLocked}
        />

        {/* 5. Danger Zone: Clear Data */}
        <div className="pt-2 border-t border-stone-100 dark:border-stone-800 space-y-2">
          <label className="text-xs font-bold text-rose-600 uppercase tracking-wider">
            Reset & Storage
          </label>
          <div className="flex items-center justify-between p-3 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20">
            <div>
              <span className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                Total Stored: {totalNotesCount} notes
              </span>
              <p className="text-[11px] text-stone-400">
                Delete all notes and reset to clean initial state.
              </p>
            </div>
            <button
              onClick={() => {
                if (confirm('Are you sure you want to permanently clear all notes?')) {
                  onClearAllNotes();
                  onClose();
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1 shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear All
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-stone-100 dark:border-stone-800">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-xl shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
