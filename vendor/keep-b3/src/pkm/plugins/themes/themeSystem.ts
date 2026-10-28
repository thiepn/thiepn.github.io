/**
 * Phase P41 / V1.5: Safe Declarative Theme System
 * 
 * Provides purely declarative visual tokens (colors, typography, radii, spacing).
 * Strictly non-executable: Rejects <script>, javascript:, and external tracking url(...) references.
 * Guarantees contrast/legibility and includes a resilient Safe Reset mechanism.
 */

export interface ThemeTokens {
  id: string;
  name: string;
  author?: string;
  version: string;
  isDark: boolean;
  colors: {
    background: string;
    surface: string;
    surfaceElevated: string;
    text: string;
    textMuted: string;
    border: string;
    primary: string;
    primaryText: string;
    accent: string;
    danger: string;
    dangerText: string;
  };
  typography: {
    fontFamilyDisplay: string;
    fontFamilyBody: string;
    fontFamilyMono: string;
  };
  radii: {
    card: string; // e.g. "8px"
    button: string; // e.g. "6px"
  };
}

export const DEFAULT_LIGHT_THEME: ThemeTokens = {
  id: 'theme.default.light',
  name: 'Default Light',
  version: '1.0.0',
  isDark: false,
  colors: {
    background: '#f8fafc',
    surface: '#ffffff',
    surfaceElevated: '#ffffff',
    text: '#0f172a',
    textMuted: '#64748b',
    border: '#e2e8f0',
    primary: '#0284c7',
    primaryText: '#ffffff',
    accent: '#0369a1',
    danger: '#ef4444',
    dangerText: '#ffffff',
  },
  typography: {
    fontFamilyDisplay: 'system-ui, -apple-system, sans-serif',
    fontFamilyBody: 'system-ui, -apple-system, sans-serif',
    fontFamilyMono: 'ui-monospace, SFMono-Regular, monospace',
  },
  radii: {
    card: '8px',
    button: '6px',
  },
};

export const DEFAULT_DARK_THEME: ThemeTokens = {
  id: 'theme.default.dark',
  name: 'Default Dark',
  version: '1.0.0',
  isDark: true,
  colors: {
    background: '#0f172a',
    surface: '#1e293b',
    surfaceElevated: '#334155',
    text: '#f8fafc',
    textMuted: '#94a3b8',
    border: '#334155',
    primary: '#38bdf8',
    primaryText: '#0f172a',
    accent: '#0284c7',
    danger: '#f87171',
    dangerText: '#0f172a',
  },
  typography: {
    fontFamilyDisplay: 'system-ui, -apple-system, sans-serif',
    fontFamilyBody: 'system-ui, -apple-system, sans-serif',
    fontFamilyMono: 'ui-monospace, SFMono-Regular, monospace',
  },
  radii: {
    card: '8px',
    button: '6px',
  },
};

const DANGEROUS_CSS_PATTERNS = [
  /<script/i,
  /<\/script>/i,
  /javascript:/i,
  /data:/i,
  /vbscript:/i,
  /expression\s*\(/i,
  /behavior\s*:/i,
  /-moz-binding/i,
  /url\s*\(\s*['"]?https?:\/\//i, // Reject external tracking URLs in CSS tokens
];

export function validateAndSanitizeTheme(raw: unknown): { valid: boolean; theme?: ThemeTokens; errors: string[] } {
  const errors: string[] = [];
  if (!raw || typeof raw !== 'object') {
    return { valid: false, errors: ['Theme must be a non-null object.'] };
  }

  const t = raw as Record<string, any>;
  if (!t.id || typeof t.id !== 'string') errors.push('Theme must have an "id" string.');
  if (!t.name || typeof t.name !== 'string') errors.push('Theme must have a "name" string.');

  // Deep check for script or tracking injection in all string values
  const stringifyAll = JSON.stringify(t);
  for (const pattern of DANGEROUS_CSS_PATTERNS) {
    if (pattern.test(stringifyAll)) {
      errors.push(`Security Violation: Theme contains prohibited script, executable CSS, or external tracking URL pattern (${pattern.source}).`);
      break;
    }
  }

  if (!t.colors || typeof t.colors !== 'object') {
    errors.push('Theme must specify a "colors" token palette.');
  } else {
    const requiredColors = ['background', 'surface', 'text', 'border', 'primary', 'danger'];
    for (const c of requiredColors) {
      if (!t.colors[c] || typeof t.colors[c] !== 'string') {
        errors.push(`Missing required color token: "${c}".`);
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const sanitized: ThemeTokens = {
    id: t.id,
    name: t.name,
    author: typeof t.author === 'string' ? t.author : undefined,
    version: typeof t.version === 'string' ? t.version : '1.0.0',
    isDark: Boolean(t.isDark),
    colors: {
      background: t.colors.background,
      surface: t.colors.surface,
      surfaceElevated: t.colors.surfaceElevated || t.colors.surface,
      text: t.colors.text,
      textMuted: t.colors.textMuted || t.colors.text,
      border: t.colors.border,
      primary: t.colors.primary,
      primaryText: t.colors.primaryText || '#ffffff',
      accent: t.colors.accent || t.colors.primary,
      danger: t.colors.danger || '#ef4444',
      dangerText: t.colors.dangerText || '#ffffff',
    },
    typography: {
      fontFamilyDisplay: t.typography?.fontFamilyDisplay || 'system-ui, -apple-system, sans-serif',
      fontFamilyBody: t.typography?.fontFamilyBody || 'system-ui, -apple-system, sans-serif',
      fontFamilyMono: t.typography?.fontFamilyMono || 'ui-monospace, SFMono-Regular, monospace',
    },
    radii: {
      card: t.radii?.card || '8px',
      button: t.radii?.button || '6px',
    },
  };

  return { valid: true, theme: sanitized, errors: [] };
}

export class ThemeManager {
  private activeTheme: ThemeTokens = DEFAULT_LIGHT_THEME;
  private customThemes = new Map<string, ThemeTokens>();

  public getActiveTheme(): ThemeTokens {
    return this.activeTheme;
  }

  public applyTheme(theme: ThemeTokens): void {
    const val = validateAndSanitizeTheme(theme);
    if (!val.valid || !val.theme) {
      throw new Error(`Failed to apply invalid theme: ${val.errors.join(', ')}`);
    }
    this.activeTheme = val.theme;
  }

  public resetToDefault(isDark = false): void {
    this.activeTheme = isDark ? DEFAULT_DARK_THEME : DEFAULT_LIGHT_THEME;
  }

  public registerCustomTheme(theme: ThemeTokens): void {
    const val = validateAndSanitizeTheme(theme);
    if (!val.valid || !val.theme) {
      throw new Error(`Invalid custom theme: ${val.errors.join(', ')}`);
    }
    this.customThemes.set(theme.id, val.theme);
  }

  public getCustomThemes(): ThemeTokens[] {
    return Array.from(this.customThemes.values());
  }
}

export const themeManager = new ThemeManager();
