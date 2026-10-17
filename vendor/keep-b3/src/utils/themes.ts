import { ThemeMode, CanvasBackground, AccentColorKey, CustomTheme } from '../types';

export interface ThemeDefinition {
  id: ThemeMode;
  name: string;
  tagline: string;
  category: 'core' | 'vibrant' | 'hacker' | 'nature' | 'retro' | 'custom';
  isDark: boolean;
  bgHex: string;
  cardHex: string;
  accentHex: string;
  borderHex: string;
  badgeHex: string;
  textHex: string;
  isCustom?: boolean;
}

export const THEME_DEFINITIONS: Record<string, ThemeDefinition> = {
  light: {
    id: 'light',
    name: 'Studio Light',
    tagline: 'Clean, high-contrast minimalist light workspace',
    category: 'core',
    isDark: false,
    bgHex: '#f0eee8',
    cardHex: '#ffffff',
    accentHex: '#d97706',
    borderHex: '#e2dfd7',
    badgeHex: '#fef3c7',
    textHex: '#1c1917',
  },
  dark: {
    id: 'dark',
    name: 'Obsidian Charcoal',
    tagline: 'Deep soothing slate twilight dark theme',
    category: 'core',
    isDark: true,
    bgHex: '#0d0d10',
    cardHex: '#18181c',
    accentHex: '#fbbf24',
    borderHex: '#27272a',
    badgeHex: '#27272a',
    textHex: '#f4f4f5',
  },
  system: {
    id: 'system',
    name: 'System Default',
    tagline: 'Synchronizes dynamically with operating system',
    category: 'core',
    isDark: false,
    bgHex: '#f0eee8',
    cardHex: '#ffffff',
    accentHex: '#f59e0b',
    borderHex: '#d6d3d1',
    badgeHex: '#fef3c7',
    textHex: '#1c1917',
  },
  cyberpunk: {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    tagline: 'Electric neon yellow, laser cyan & hot pink on void black',
    category: 'vibrant',
    isDark: true,
    bgHex: '#090814',
    cardHex: '#131124',
    accentHex: '#fcee0a',
    borderHex: '#3b2d6e',
    badgeHex: '#ffe600',
    textHex: '#00f0ff',
  },
  synthwave: {
    id: 'synthwave',
    name: 'Synthwave 80s',
    tagline: 'Retro sunset magenta, glowing neon violet & cyan grids',
    category: 'retro',
    isDark: true,
    bgHex: '#18122B',
    cardHex: '#251B3E',
    accentHex: '#ff2a85',
    borderHex: '#483475',
    badgeHex: '#ff2a85',
    textHex: '#05d9e8',
  },
  nordic: {
    id: 'nordic',
    name: 'Nordic Frost',
    tagline: 'Arctic polar glacier blue, crisp snow & deep slate',
    category: 'nature',
    isDark: true,
    bgHex: '#151922',
    cardHex: '#1e2430',
    accentHex: '#88c0d0',
    borderHex: '#2e3748',
    badgeHex: '#5e81ac',
    textHex: '#eceff4',
  },
  forest: {
    id: 'forest',
    name: 'Evergreen Forest',
    tagline: 'Botanical spruce, moss green & earthy woodland tones',
    category: 'nature',
    isDark: true,
    bgHex: '#0e1813',
    cardHex: '#15241d',
    accentHex: '#10b981',
    borderHex: '#204033',
    badgeHex: '#064e3b',
    textHex: '#ecfdf5',
  },
  sunset: {
    id: 'sunset',
    name: 'Golden Sunset',
    tagline: 'Warm terracotta, rich golden amber & dusk twilight glow',
    category: 'vibrant',
    isDark: false,
    bgHex: '#fff6ed',
    cardHex: '#ffffff',
    accentHex: '#ea580c',
    borderHex: '#fed7aa',
    badgeHex: '#ffedd5',
    textHex: '#431407',
  },
  sakura: {
    id: 'sakura',
    name: 'Sakura Blossom',
    tagline: 'Delicate Japanese cherry blossom & soft floral rose quartz',
    category: 'nature',
    isDark: false,
    bgHex: '#fdf2f4',
    cardHex: '#ffffff',
    accentHex: '#e11d48',
    borderHex: '#fbcfe8',
    badgeHex: '#ffe4e6',
    textHex: '#4c0519',
  },
  matrix: {
    id: 'matrix',
    name: 'Matrix Terminal',
    tagline: 'Ultra-vibrant green phosphor CRT hacker console on pure onyx',
    category: 'hacker',
    isDark: true,
    bgHex: '#020d06',
    cardHex: '#06160c',
    accentHex: '#00ff66',
    borderHex: '#005522',
    badgeHex: '#003314',
    textHex: '#55ff99',
  },
  dracula: {
    id: 'dracula',
    name: 'Gothic Dracula',
    tagline: 'Classic vampire midnight violet, vibrant cyan & orchid',
    category: 'vibrant',
    isDark: true,
    bgHex: '#1e1f29',
    cardHex: '#282a36',
    accentHex: '#ff79c6',
    borderHex: '#44475a',
    badgeHex: '#6272a4',
    textHex: '#f8f8f2',
  },
  sepia: {
    id: 'sepia',
    name: 'Vintage Sepia',
    tagline: 'Warm dark roast espresso, vintage parchment & aged walnut',
    category: 'retro',
    isDark: false,
    bgHex: '#f5eee6',
    cardHex: '#fffdfa',
    accentHex: '#b45309',
    borderHex: '#e6d8cb',
    badgeHex: '#fef3c7',
    textHex: '#3b2210',
  },
  ocean: {
    id: 'ocean',
    name: 'Deep Oceanic Abyss',
    tagline: 'Midnight navy ultramarine with bioluminescent seafoam glow',
    category: 'nature',
    isDark: true,
    bgHex: '#061320',
    cardHex: '#0d2238',
    accentHex: '#06b6d4',
    borderHex: '#163b5c',
    badgeHex: '#083344',
    textHex: '#cffafe',
  },
  monokai: {
    id: 'monokai',
    name: 'Monokai Pro',
    tagline: 'Iconic vibrant developer palette with lime, punchy pink & gold',
    category: 'hacker',
    isDark: true,
    bgHex: '#1a191f',
    cardHex: '#222129',
    accentHex: '#ffd866',
    borderHex: '#36353d',
    badgeHex: '#ff6188',
    textHex: '#fcfcfa',
  },
};

export const THEME_LIST = Object.values(THEME_DEFINITIONS);

export interface AccentColorConfig {
  id: AccentColorKey;
  name: string;
  hex: string;
  ringClass: string;
  bgClass: string;
  textClass: string;
  glowHex: string;
}

export const ACCENT_COLORS: Record<AccentColorKey, AccentColorConfig> = {
  amber: {
    id: 'amber',
    name: 'Golden Amber',
    hex: '#f59e0b',
    ringClass: 'ring-amber-500',
    bgClass: 'bg-amber-500',
    textClass: 'text-amber-500',
    glowHex: 'rgba(245, 158, 11, 0.4)',
  },
  emerald: {
    id: 'emerald',
    name: 'Vivid Emerald',
    hex: '#10b981',
    ringClass: 'ring-emerald-500',
    bgClass: 'bg-emerald-500',
    textClass: 'text-emerald-500',
    glowHex: 'rgba(16, 185, 129, 0.4)',
  },
  blue: {
    id: 'blue',
    name: 'Electric Azure',
    hex: '#3b82f6',
    ringClass: 'ring-blue-500',
    bgClass: 'bg-blue-500',
    textClass: 'text-blue-500',
    glowHex: 'rgba(59, 130, 246, 0.4)',
  },
  indigo: {
    id: 'indigo',
    name: 'Royal Indigo',
    hex: '#6366f1',
    ringClass: 'ring-indigo-500',
    bgClass: 'bg-indigo-500',
    textClass: 'text-indigo-500',
    glowHex: 'rgba(99, 102, 241, 0.4)',
  },
  violet: {
    id: 'violet',
    name: 'Neon Violet',
    hex: '#8b5cf6',
    ringClass: 'ring-violet-500',
    bgClass: 'bg-violet-500',
    textClass: 'text-violet-500',
    glowHex: 'rgba(139, 92, 246, 0.4)',
  },
  rose: {
    id: 'rose',
    name: 'Velvet Rose',
    hex: '#f43f5e',
    ringClass: 'ring-rose-500',
    bgClass: 'bg-rose-500',
    textClass: 'text-rose-500',
    glowHex: 'rgba(244, 63, 94, 0.4)',
  },
  pink: {
    id: 'pink',
    name: 'Hot Magenta',
    hex: '#ec4899',
    ringClass: 'ring-pink-500',
    bgClass: 'bg-pink-500',
    textClass: 'text-pink-500',
    glowHex: 'rgba(236, 72, 153, 0.4)',
  },
  cyan: {
    id: 'cyan',
    name: 'Laser Cyan',
    hex: '#06b6d4',
    ringClass: 'ring-cyan-500',
    bgClass: 'bg-cyan-500',
    textClass: 'text-cyan-500',
    glowHex: 'rgba(6, 182, 212, 0.4)',
  },
  orange: {
    id: 'orange',
    name: 'Sunset Peach',
    hex: '#f97316',
    ringClass: 'ring-orange-500',
    bgClass: 'bg-orange-500',
    textClass: 'text-orange-500',
    glowHex: 'rgba(249, 115, 22, 0.4)',
  },
  lime: {
    id: 'lime',
    name: 'Acid Lime',
    hex: '#84cc16',
    ringClass: 'ring-lime-500',
    bgClass: 'bg-lime-500',
    textClass: 'text-lime-500',
    glowHex: 'rgba(132, 204, 22, 0.4)',
  },
};

export const ACCENT_LIST = Object.values(ACCENT_COLORS);

export interface CanvasTextureConfig {
  id: CanvasBackground;
  label: string;
  desc: string;
  badge: string;
}

export const CANVAS_TEXTURES: CanvasTextureConfig[] = [
  { id: 'clean', label: 'Clean Solid', desc: 'Minimalist neutral tone', badge: 'Minimal' },
  { id: 'warm-paper', label: 'Warm Paper', desc: 'Soft organic parchment texture', badge: 'Paper' },
  { id: 'subtle-dots', label: 'Dotted Grid', desc: 'Architectural subtle dot pattern', badge: 'Draft' },
  { id: 'subtle-grid', label: 'Technical Grid', desc: 'Crisp engineering drafting lines', badge: 'Matrix' },
  { id: 'vintage-notepad', label: 'Vintage Notepad', desc: 'Horizontal lined notes sheet', badge: 'Classic' },
  { id: 'dark-obsidian', label: 'Dark Obsidian', desc: 'Deep carbon twilight contrast', badge: 'Dark' },
  { id: 'isometric-grid', label: 'Isometric 3D', desc: 'Dynamic 3D geometric isometric grid', badge: '3D' },
  { id: 'neon-circuit', label: 'Neon Circuit', desc: 'Glowing cyberpunk digital matrix', badge: 'Sci-Fi' },
  { id: 'galaxy-dust', label: 'Galaxy Stardust', desc: 'Subtle cosmic starry night sparkle', badge: 'Space' },
  { id: 'japanese-washi', label: 'Japanese Washi', desc: 'Refined fibrous washi paper finish', badge: 'Artisan' },
  { id: 'blueprint', label: 'Architect Blueprint', desc: 'Classic engineering cyan blueprint', badge: 'Design' },
  { id: 'honeycomb', label: 'Hex Honeycomb', desc: 'Geometric honeycomb hexagonal mesh', badge: 'Geo' },
];

export function isHexDark(hex: string): boolean {
  if (!hex) return false;
  const cleanHex = hex.replace('#', '').trim();
  if (cleanHex.length !== 6 && cleanHex.length !== 3) return false;
  const fullHex =
    cleanHex.length === 3
      ? cleanHex
          .split('')
          .map((c) => c + c)
          .join('')
      : cleanHex;
  const r = parseInt(fullHex.substring(0, 2), 16);
  const g = parseInt(fullHex.substring(2, 4), 16);
  const b = parseInt(fullHex.substring(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return false;
  // Relative perceived luminance (ITU-R BT.709)
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance < 0.45;
}

export function getHexLuminance(hex: string): number {
  if (!hex) return 0;
  const cleanHex = hex.replace('#', '').trim();
  if (cleanHex.length !== 6 && cleanHex.length !== 3) return 0;
  const fullHex =
    cleanHex.length === 3
      ? cleanHex
          .split('')
          .map((c) => c + c)
          .join('')
      : cleanHex;
  const r = parseInt(fullHex.substring(0, 2), 16) / 255;
  const g = parseInt(fullHex.substring(2, 4), 16) / 255;
  const b = parseInt(fullHex.substring(4, 6), 16) / 255;

  const a = [r, g, b].map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

export function calculateContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getHexLuminance(hex1);
  const lum2 = getHexLuminance(hex2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

export function getContrastAssessment(ratio: number): {
  label: string;
  badge: string;
  status: 'excellent' | 'good' | 'fair' | 'poor';
} {
  if (ratio >= 7) {
    return { label: 'AAA Pass (Excellent)', badge: '7.0+ AAA', status: 'excellent' };
  }
  if (ratio >= 4.5) {
    return { label: 'AA Pass (Optimal)', badge: '4.5+ AA', status: 'good' };
  }
  if (ratio >= 3) {
    return { label: 'AA Large Text Only', badge: '3.0+ Large', status: 'fair' };
  }
  return { label: 'Low Contrast Warning', badge: '<3.0 Low', status: 'poor' };
}

export function normalizeHex(hex: string, fallback: string = '#ffffff'): string {
  let cleaned = hex.trim();
  if (!cleaned.startsWith('#')) {
    cleaned = '#' + cleaned;
  }
  if (/^#[0-9A-Fa-f]{6}$/.test(cleaned)) {
    return cleaned;
  }
  if (/^#[0-9A-Fa-f]{3}$/.test(cleaned)) {
    return (
      '#' +
      cleaned
        .slice(1)
        .split('')
        .map((c) => c + c)
        .join('')
    );
  }
  return fallback;
}

export function customThemeToDefinition(custom: CustomTheme): ThemeDefinition {
  const isDark = custom.isDark !== undefined ? custom.isDark : isHexDark(custom.backgroundColor);
  const cardHex =
    custom.cardColor ||
    (isDark ? '#1a1921' : '#ffffff');
  const textHex =
    custom.textColor ||
    (isDark ? '#f4f4f5' : '#1c1917');
  const borderHex = isDark ? '#2e2c38' : '#e2dfd7';
  const badgeHex = custom.accentColor;

  return {
    id: custom.id,
    name: custom.name,
    tagline: `Custom palette (Primary: ${custom.primaryColor}, Accent: ${custom.accentColor})`,
    category: 'custom',
    isDark,
    bgHex: custom.backgroundColor,
    cardHex,
    accentHex: custom.accentColor,
    borderHex,
    badgeHex,
    textHex,
    isCustom: true,
  };
}

export interface StarterThemePalette {
  name: string;
  description: string;
  primaryColor: string;
  backgroundColor: string;
  accentColor: string;
  cardColor?: string;
  textColor?: string;
  isDark?: boolean;
}

export const STARTER_THEME_PALETTES: StarterThemePalette[] = [
  {
    name: 'Neon Cyberpunk',
    description: 'Electric laser cyan, deep void black, and blazing volt yellow',
    primaryColor: '#00f0ff',
    backgroundColor: '#090814',
    accentColor: '#fcee0a',
    cardColor: '#120f26',
    textColor: '#e0f7fa',
    isDark: true,
  },
  {
    name: 'Midnight Amethyst',
    description: 'Royal purple twilight canvas with electric neon lavender',
    primaryColor: '#c084fc',
    backgroundColor: '#0f0b1e',
    accentColor: '#a855f7',
    cardColor: '#1a1433',
    textColor: '#f3e8ff',
    isDark: true,
  },
  {
    name: 'Matcha Forest',
    description: 'Fresh botanical emerald green with calming herbal tea undertones',
    primaryColor: '#34d399',
    backgroundColor: '#0c1a14',
    accentColor: '#10b981',
    cardColor: '#142920',
    textColor: '#ecfdf5',
    isDark: true,
  },
  {
    name: 'Nordic Arctic Glaze',
    description: 'Polar blue frost accents on crisp deep slate granite',
    primaryColor: '#88c0d0',
    backgroundColor: '#12161f',
    accentColor: '#81a1c1',
    cardColor: '#1a202c',
    textColor: '#eceff4',
    isDark: true,
  },
  {
    name: 'Warm Terracotta Sand',
    description: 'Sun-drenched desert clay, warm terracotta and rich amber glow',
    primaryColor: '#9a3412',
    backgroundColor: '#fff7ed',
    accentColor: '#ea580c',
    cardColor: '#ffffff',
    textColor: '#431407',
    isDark: false,
  },
  {
    name: 'Rose Gold Luxury',
    description: 'Soft pastel blossom blush with champagne gold highlights',
    primaryColor: '#be185d',
    backgroundColor: '#fff1f2',
    accentColor: '#f43f5e',
    cardColor: '#ffffff',
    textColor: '#4c0519',
    isDark: false,
  },
  {
    name: 'Espresso Roast & Brass',
    description: 'Dark artisan roast coffee with polished vintage brass trim',
    primaryColor: '#fbbf24',
    backgroundColor: '#17120e',
    accentColor: '#d97706',
    cardColor: '#241c16',
    textColor: '#fef3c7',
    isDark: true,
  },
  {
    name: 'Architect Blueprint',
    description: 'Technical cyan drafting grid on rich naval cobalt blue',
    primaryColor: '#38bdf8',
    backgroundColor: '#081e36',
    accentColor: '#0ea5e9',
    cardColor: '#0e2b4d',
    textColor: '#e0f2fe',
    isDark: true,
  },
];

export function isDarkTheme(theme: ThemeMode, customThemes?: CustomTheme[]): boolean {
  if (typeof theme === 'string' && customThemes) {
    const custom = customThemes.find((ct) => ct.id === theme);
    if (custom) {
      if (custom.isDark !== undefined) return custom.isDark;
      return isHexDark(custom.backgroundColor);
    }
  }
  if (theme === 'system') {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  }
  const config = THEME_DEFINITIONS[theme];
  return config ? config.isDark : false;
}

export function getAllThemes(customThemes?: CustomTheme[]): ThemeDefinition[] {
  const builtin = THEME_LIST;
  const customDefs = (customThemes || []).map(customThemeToDefinition);
  return [...builtin, ...customDefs];
}

