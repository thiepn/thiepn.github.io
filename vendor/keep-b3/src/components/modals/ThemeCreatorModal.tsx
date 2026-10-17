import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Sparkles,
  Palette,
  Check,
  RotateCcw,
  Eye,
  Sliders,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Bookmark,
  Layers,
  Wand2,
} from 'lucide-react';
import { CustomTheme, AppSettings } from '../../types';
import {
  STARTER_THEME_PALETTES,
  StarterThemePalette,
  isHexDark,
  calculateContrastRatio,
  getContrastAssessment,
  normalizeHex,
} from '../../utils/themes';

interface ThemeCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingTheme?: CustomTheme | null;
  onSaveTheme: (theme: CustomTheme, andApply?: boolean) => void;
  onDeleteTheme?: (themeId: string) => void;
  currentSettings: AppSettings;
}

const POPULAR_PRIMARY_SWATCHES = [
  '#00f0ff',
  '#38bdf8',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#c084fc',
  '#ec4899',
  '#f43f5e',
  '#f97316',
  '#fbbf24',
  '#10b981',
  '#34d399',
  '#1c1917',
  '#f4f4f5',
];

const POPULAR_BG_SWATCHES = [
  // Dark
  '#090814',
  '#0f172a',
  '#0d0d10',
  '#12161f',
  '#0c1a14',
  '#17120e',
  '#130e24',
  '#081e36',
  // Light
  '#f0eee8',
  '#ffffff',
  '#f8fafc',
  '#fff7ed',
  '#fff1f2',
  '#f5eee6',
  '#f0fdf4',
  '#f0f9ff',
];

const POPULAR_ACCENT_SWATCHES = [
  '#f59e0b',
  '#fcee0a',
  '#10b981',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#f43f5e',
  '#ea580c',
  '#84cc16',
  '#e11d48',
  '#00ff66',
];

export const ThemeCreatorModal: React.FC<ThemeCreatorModalProps> = ({
  isOpen,
  onClose,
  editingTheme,
  onSaveTheme,
  onDeleteTheme,
  currentSettings,
}) => {
  const [name, setName] = useState('My Custom Theme');
  const [primaryColor, setPrimaryColor] = useState('#38bdf8');
  const [backgroundColor, setBackgroundColor] = useState('#0d0d10');
  const [accentColor, setAccentColor] = useState('#f59e0b');
  const [cardColor, setCardColor] = useState('');
  const [textColor, setTextColor] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showStarters, setShowStarters] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize or reset when opened / editing theme changes
  useEffect(() => {
    if (!isOpen) return;
    if (editingTheme) {
      setName(editingTheme.name);
      setPrimaryColor(editingTheme.primaryColor);
      setBackgroundColor(editingTheme.backgroundColor);
      setAccentColor(editingTheme.accentColor);
      setCardColor(editingTheme.cardColor || '');
      setTextColor(editingTheme.textColor || '');
      setShowStarters(false);
    } else {
      // Pick a random fresh starter or clean default
      const defaultStarter = STARTER_THEME_PALETTES[0];
      setName('My Custom Theme');
      setPrimaryColor(defaultStarter.primaryColor);
      setBackgroundColor(defaultStarter.backgroundColor);
      setAccentColor(defaultStarter.accentColor);
      setCardColor(defaultStarter.cardColor || '');
      setTextColor(defaultStarter.textColor || '');
      setShowStarters(false);
    }
    setErrorMsg(null);
  }, [isOpen, editingTheme]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Derived properties
  const isDark = useMemo(() => isHexDark(backgroundColor), [backgroundColor]);

  const effectiveCardColor = useMemo(() => {
    if (cardColor && cardColor.trim().length >= 4) {
      return normalizeHex(cardColor, isDark ? '#1a1824' : '#ffffff');
    }
    return isDark ? '#1a1824' : '#ffffff';
  }, [cardColor, isDark]);

  const effectiveTextColor = useMemo(() => {
    if (textColor && textColor.trim().length >= 4) {
      return normalizeHex(textColor, isDark ? '#f4f4f5' : '#1c1917');
    }
    return isDark ? '#f4f4f5' : '#1c1917';
  }, [textColor, isDark]);

  // Contrast analysis
  const textContrast = useMemo(
    () => calculateContrastRatio(effectiveTextColor, effectiveCardColor),
    [effectiveTextColor, effectiveCardColor]
  );
  const primaryContrast = useMemo(
    () => calculateContrastRatio(primaryColor, effectiveCardColor),
    [primaryColor, effectiveCardColor]
  );
  const accentContrast = useMemo(
    () => calculateContrastRatio(accentColor, backgroundColor),
    [accentColor, backgroundColor]
  );

  const textAssessment = useMemo(() => getContrastAssessment(textContrast), [textContrast]);
  const primaryAssessment = useMemo(() => getContrastAssessment(primaryContrast), [primaryContrast]);

  if (!isOpen) return null;

  const handleApplyStarter = (starter: StarterThemePalette) => {
    setName(starter.name);
    setPrimaryColor(starter.primaryColor);
    setBackgroundColor(starter.backgroundColor);
    setAccentColor(starter.accentColor);
    setCardColor(starter.cardColor || '');
    setTextColor(starter.textColor || '');
    setShowStarters(false);
    setErrorMsg(null);
  };

  const validateAndSave = (andApply: boolean = true) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg('Please give your theme a name');
      return;
    }

    const normPrimary = normalizeHex(primaryColor, '#38bdf8');
    const normBg = normalizeHex(backgroundColor, '#0d0d10');
    const normAccent = normalizeHex(accentColor, '#f59e0b');
    const normCard = cardColor ? normalizeHex(cardColor, isDark ? '#1a1824' : '#ffffff') : undefined;
    const normText = textColor ? normalizeHex(textColor, isDark ? '#f4f4f5' : '#1c1917') : undefined;

    const themeId = editingTheme?.id || `custom-${Date.now()}`;

    const newTheme: CustomTheme = {
      id: themeId,
      name: trimmedName,
      primaryColor: normPrimary,
      backgroundColor: normBg,
      accentColor: normAccent,
      cardColor: normCard,
      textColor: normText,
      isDark: isHexDark(normBg),
      createdAt: editingTheme?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveTheme(newTheme, andApply);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="theme-creator-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-xs transition-colors"
              style={{ backgroundColor: accentColor }}
            >
              <Wand2 className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2
                id="theme-creator-title"
                className="text-base font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2"
              >
                {editingTheme ? 'Edit Custom Theme' : 'Theme Creator'}
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/40">
                  {isDark ? 'Dark Base' : 'Light Base'}
                </span>
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Define bespoke colors for primary headings, canvas background, and accent highlights.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowStarters(!showStarters)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 ${
                showStarters
                  ? 'bg-amber-500 text-stone-950 border-amber-500 font-semibold'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-200 dark:hover:bg-stone-700'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Presets & Inspiration</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Inspiration Starters Drawer */}
          {showStarters && (
            <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-950/70 border border-stone-200 dark:border-stone-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Starter Palettes
                </span>
                <span className="text-[11px] text-stone-400">Click any palette to load its color profile</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {STARTER_THEME_PALETTES.map((starter) => (
                  <button
                    key={starter.name}
                    onClick={() => handleApplyStarter(starter)}
                    className="p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-amber-400 dark:hover:border-amber-500 text-left transition-all group shadow-2xs hover:shadow-xs"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-stone-800 dark:text-stone-200 truncate group-hover:text-amber-600 dark:group-hover:text-amber-400">
                        {starter.name}
                      </span>
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: starter.accentColor }}
                      />
                    </div>
                    {/* Swatch Triple */}
                    <div className="flex h-3.5 rounded-md overflow-hidden border border-stone-200 dark:border-stone-700">
                      <div
                        className="flex-1"
                        style={{ backgroundColor: starter.backgroundColor }}
                        title={`Background: ${starter.backgroundColor}`}
                      />
                      <div
                        className="flex-1"
                        style={{ backgroundColor: starter.primaryColor }}
                        title={`Primary: ${starter.primaryColor}`}
                      />
                      <div
                        className="flex-1"
                        style={{ backgroundColor: starter.accentColor }}
                        title={`Accent: ${starter.accentColor}`}
                      />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Theme Name Input */}
          <div className="space-y-1.5">
            <label
              htmlFor="theme-name-input"
              className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center justify-between"
            >
              <span>Theme Name</span>
              <span className="text-[11px] text-stone-400 font-normal">Give your theme a descriptive name</span>
            </label>
            <input
              id="theme-name-input"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder="e.g. Electric Sapphire, Sunset Clay, Dark Emerald"
              className="w-full px-3 py-2 text-sm bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-stone-900 dark:text-stone-100 placeholder-stone-400"
            />
            {errorMsg && <p className="text-xs text-rose-500">{errorMsg}</p>}
          </div>

          {/* Color Pickers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Primary Color */}
            <div className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/40 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                  Primary Color
                </label>
                <span
                  className="w-4 h-4 rounded-full border border-stone-300 dark:border-stone-700 shadow-2xs"
                  style={{ backgroundColor: primaryColor }}
                />
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-tight">
                Used for headings, key typography, and prominent markers.
              </p>

              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={primaryColor.startsWith('#') ? primaryColor : '#38bdf8'}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-9 h-9 rounded-lg cursor-pointer border border-stone-300 dark:border-stone-700 p-0.5 bg-transparent"
                  aria-label="Pick Primary Color"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  placeholder="#38bdf8"
                  className="flex-1 px-2.5 py-1.5 text-xs font-mono bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* Quick swatches */}
              <div className="grid grid-cols-7 gap-1 pt-1">
                {POPULAR_PRIMARY_SWATCHES.slice(0, 14).map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => setPrimaryColor(hex)}
                    style={{ backgroundColor: hex }}
                    className={`w-5 h-5 rounded-md border border-stone-300 dark:border-stone-700 transition-transform ${
                      primaryColor.toLowerCase() === hex.toLowerCase()
                        ? 'scale-120 ring-2 ring-amber-500 z-10'
                        : 'hover:scale-110 opacity-90 hover:opacity-100'
                    }`}
                    title={hex}
                  />
                ))}
              </div>
            </div>

            {/* 2. Background Color */}
            <div className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/40 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                  Background Color
                </label>
                <span
                  className="w-4 h-4 rounded-full border border-stone-300 dark:border-stone-700 shadow-2xs"
                  style={{ backgroundColor: backgroundColor }}
                />
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-tight">
                Controls the main workspace canvas and page environment.
              </p>

              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={backgroundColor.startsWith('#') ? backgroundColor : '#0d0d10'}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="w-9 h-9 rounded-lg cursor-pointer border border-stone-300 dark:border-stone-700 p-0.5 bg-transparent"
                  aria-label="Pick Background Color"
                />
                <input
                  type="text"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  placeholder="#0d0d10"
                  className="flex-1 px-2.5 py-1.5 text-xs font-mono bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* Quick swatches */}
              <div className="grid grid-cols-8 gap-1 pt-1">
                {POPULAR_BG_SWATCHES.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => setBackgroundColor(hex)}
                    style={{ backgroundColor: hex }}
                    className={`w-5 h-5 rounded-md border border-stone-300 dark:border-stone-700 transition-transform ${
                      backgroundColor.toLowerCase() === hex.toLowerCase()
                        ? 'scale-120 ring-2 ring-amber-500 z-10'
                        : 'hover:scale-110 opacity-90 hover:opacity-100'
                    }`}
                    title={hex}
                  />
                ))}
              </div>
            </div>

            {/* 3. Accent Color */}
            <div className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/40 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                  Accent Color
                </label>
                <span
                  className="w-4 h-4 rounded-full border border-stone-300 dark:border-stone-700 shadow-2xs"
                  style={{ backgroundColor: accentColor }}
                />
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-tight">
                Controls buttons, focus rings, glow effects & badges.
              </p>

              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={accentColor.startsWith('#') ? accentColor : '#f59e0b'}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-9 h-9 rounded-lg cursor-pointer border border-stone-300 dark:border-stone-700 p-0.5 bg-transparent"
                  aria-label="Pick Accent Color"
                />
                <input
                  type="text"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  placeholder="#f59e0b"
                  className="flex-1 px-2.5 py-1.5 text-xs font-mono bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* Quick swatches */}
              <div className="grid grid-cols-6 gap-1 pt-1">
                {POPULAR_ACCENT_SWATCHES.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => setAccentColor(hex)}
                    style={{ backgroundColor: hex }}
                    className={`w-5 h-5 rounded-md border border-stone-300 dark:border-stone-700 transition-transform ${
                      accentColor.toLowerCase() === hex.toLowerCase()
                        ? 'scale-120 ring-2 ring-amber-500 z-10'
                        : 'hover:scale-110 opacity-90 hover:opacity-100'
                    }`}
                    title={hex}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Advanced Fine Tuning Toggle */}
          <div className="border-t border-stone-200 dark:border-stone-800 pt-3">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs font-medium text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 flex items-center gap-1.5 transition-colors"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Surface & Text Options'}</span>
            </button>

            {showAdvanced && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 rounded-xl bg-stone-50 dark:bg-stone-950/60 border border-stone-200 dark:border-stone-800 animate-in fade-in duration-150">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-stone-700 dark:text-stone-300 flex items-center justify-between">
                    <span>Card Surface Override</span>
                    <span className="text-[10px] text-stone-400">Leave blank for auto</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={cardColor || effectiveCardColor}
                      onChange={(e) => setCardColor(e.target.value)}
                      className="w-7 h-7 rounded cursor-pointer border border-stone-300 dark:border-stone-700 p-0.5 bg-transparent"
                    />
                    <input
                      type="text"
                      value={cardColor}
                      onChange={(e) => setCardColor(e.target.value)}
                      placeholder={`Auto (${effectiveCardColor})`}
                      className="flex-1 px-2.5 py-1 text-xs font-mono bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100"
                    />
                    {cardColor && (
                      <button
                        type="button"
                        onClick={() => setCardColor('')}
                        className="text-[11px] text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 px-1.5"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-stone-700 dark:text-stone-300 flex items-center justify-between">
                    <span>Body Text Override</span>
                    <span className="text-[10px] text-stone-400">Leave blank for auto</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={textColor || effectiveTextColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="w-7 h-7 rounded cursor-pointer border border-stone-300 dark:border-stone-700 p-0.5 bg-transparent"
                    />
                    <input
                      type="text"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      placeholder={`Auto (${effectiveTextColor})`}
                      className="flex-1 px-2.5 py-1 text-xs font-mono bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100"
                    />
                    {textColor && (
                      <button
                        type="button"
                        onClick={() => setTextColor('')}
                        className="text-[11px] text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 px-1.5"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Live Interactive Preview Canvas */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-amber-500" />
                Live Theme Preview
              </span>
              <div className="flex items-center gap-2 text-xs">
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-medium flex items-center gap-1 border ${
                    primaryAssessment.status === 'excellent' || primaryAssessment.status === 'good'
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-800/50'
                      : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-200/50 dark:border-amber-800/50'
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  Primary Ratio: {primaryContrast.toFixed(1)}:1 ({primaryAssessment.badge})
                </span>
              </div>
            </div>

            {/* Canvas Mockup Box */}
            <div
              className="p-5 rounded-2xl border border-stone-300 dark:border-stone-800 transition-all duration-200 shadow-inner flex flex-col items-center justify-center min-h-[190px]"
              style={{ backgroundColor }}
            >
              {/* Sample Note Card */}
              <div
                className="w-full max-w-md p-4 rounded-xl border transition-all duration-200 shadow-md"
                style={{
                  backgroundColor: effectiveCardColor,
                  borderColor: isDark ? '#2e2c38' : '#e2dfd7',
                  color: effectiveTextColor,
                  boxShadow: `0 4px 20px -2px ${accentColor}26`,
                }}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4
                    className="text-sm font-semibold tracking-tight truncate flex-1"
                    style={{ color: primaryColor }}
                  >
                    ✨ {name || 'Custom Theme Notes'}
                  </h4>
                  <span
                    className="w-2.5 h-2.5 rounded-full ring-2 ring-offset-1"
                    style={{
                      backgroundColor: accentColor,
                      borderColor: effectiveCardColor,
                    }}
                  />
                </div>

                <p className="text-xs opacity-90 leading-relaxed mb-3">
                  This live preview demonstrates how note titles, tags, and interactive action controls will
                  render with your chosen palette.
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-stone-200/40 dark:border-stone-800/60">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-md font-medium border"
                      style={{
                        backgroundColor: `${accentColor}1a`,
                        color: accentColor,
                        borderColor: `${accentColor}40`,
                      }}
                    >
                      #bespoke
                    </span>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-md font-medium border"
                      style={{
                        backgroundColor: `${primaryColor}1a`,
                        color: primaryColor,
                        borderColor: `${primaryColor}40`,
                      }}
                    >
                      #palette
                    </span>
                  </div>

                  <button
                    type="button"
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-lg text-stone-950 transition-transform active:scale-95 shadow-xs"
                    style={{ backgroundColor: accentColor }}
                  >
                    Active Action
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950/40 shrink-0">
          <div>
            {editingTheme && onDeleteTheme && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Delete custom theme "${editingTheme.name}"?`)) {
                    onDeleteTheme(editingTheme.id);
                    onClose();
                  }
                }}
                className="px-3 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg border border-rose-200/60 dark:border-rose-900/60 transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Theme</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-lg transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => validateAndSave(false)}
              className="px-3.5 py-1.5 text-xs font-medium bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 hover:bg-stone-300 dark:hover:bg-stone-700 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Save Theme</span>
            </button>

            <button
              type="button"
              onClick={() => validateAndSave(true)}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg text-stone-950 shadow-xs hover:brightness-105 active:scale-95 transition-all flex items-center gap-1.5"
              style={{ backgroundColor: accentColor }}
            >
              <Check className="w-3.5 h-3.5" />
              <span>{editingTheme ? 'Update & Apply' : 'Save & Apply Theme'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
