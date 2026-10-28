/**
 * V2.12 Keyboard Shortcuts Normalizer
 * 
 * Provides cross-platform shortcut formatting (Cmd vs Ctrl), conflict-free key matching,
 * and strict IME composition suppression during multilingual text input.
 */

export interface NormalizedKeyEvent {
  key: string;
  code: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  isComposing: boolean;
  targetTagName?: string;
  isEditableTarget: boolean;
}

export class KeyboardShortcutsNormalizer {
  private static instance: KeyboardShortcutsNormalizer | null = null;
  private isMac: boolean;

  private constructor() {
    this.isMac = typeof navigator !== 'undefined' &&
      (/Macintosh|MacIntel|iPad|iPhone|iPod/.test(navigator.userAgent) ||
       (navigator.platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1));
  }

  public static getInstance(): KeyboardShortcutsNormalizer {
    if (!KeyboardShortcutsNormalizer.instance) {
      KeyboardShortcutsNormalizer.instance = new KeyboardShortcutsNormalizer();
    }
    return KeyboardShortcutsNormalizer.instance;
  }

  /**
   * Formats a standard descriptor (e.g. "Mod+Shift+F") into platform-specific symbols/text
   */
  public formatForPlatform(shortcut: string): string {
    if (!shortcut) return '';
    
    let formatted = shortcut;
    if (this.isMac) {
      formatted = formatted
        .replace(/Mod/gi, '⌘')
        .replace(/Ctrl/gi, '⌃')
        .replace(/Alt/gi, '⌥')
        .replace(/Shift/gi, '⇧')
        .replace(/\+/g, '');
    } else {
      formatted = formatted
        .replace(/Mod/gi, 'Ctrl')
        .replace(/Alt/gi, 'Alt')
        .replace(/Shift/gi, 'Shift');
    }
    return formatted;
  }

  /**
   * Extracts clean normalized event properties from a raw KeyboardEvent
   */
  public normalizeEvent(e: KeyboardEvent): NormalizedKeyEvent {
    const target = e.target as HTMLElement | null;
    const isEditable = target
      ? target.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
      : false;

    // IME composition is active if isComposing is true or keyCode is 229
    const isComposing = Boolean(e.isComposing || e.keyCode === 229);

    return {
      key: e.key.toLowerCase(),
      code: e.code,
      ctrlKey: e.ctrlKey,
      metaKey: e.metaKey,
      shiftKey: e.shiftKey,
      altKey: e.altKey,
      isComposing,
      targetTagName: target?.tagName,
      isEditableTarget: isEditable,
    };
  }

  /**
   * Tests whether a KeyboardEvent matches a canonical shortcut descriptor (e.g. "Mod+K")
   */
  public matches(e: KeyboardEvent, descriptor: string): boolean {
    const norm = this.normalizeEvent(e);

    // 1. Never trigger global shortcuts while user is composing IME characters (e.g. Japanese Kanji, Chinese Pinyin)
    if (norm.isComposing) {
      return false;
    }

    const parts = descriptor.split('+').map(p => p.trim().toLowerCase());
    
    const wantsMod = parts.includes('mod');
    const wantsCtrl = parts.includes('ctrl');
    const wantsMeta = parts.includes('meta') || parts.includes('cmd');
    const wantsShift = parts.includes('shift');
    const wantsAlt = parts.includes('alt') || parts.includes('opt');

    // Extract primary key
    const primaryKey = parts.find(p => !['mod', 'ctrl', 'meta', 'cmd', 'shift', 'alt', 'opt'].includes(p)) || '';

    // Modifier validation
    const modPressed = this.isMac ? norm.metaKey : norm.ctrlKey;
    if (wantsMod && !modPressed) return false;
    if (!wantsMod) {
      if (wantsCtrl && !norm.ctrlKey) return false;
      if (wantsMeta && !norm.metaKey) return false;
    }
    if (wantsShift !== norm.shiftKey) return false;
    if (wantsAlt !== norm.altKey) return false;

    // Key match
    if (primaryKey === 'enter' && norm.key === 'enter') return true;
    if (primaryKey === 'escape' && (norm.key === 'escape' || norm.key === 'esc')) return true;
    if (primaryKey === 'space' && norm.key === ' ') return true;
    if (primaryKey === '\\' && norm.key === '\\') return true;
    if (primaryKey === '/' && norm.key === '/') return true;
    if (primaryKey === ',' && norm.key === ',') return true;

    return norm.key === primaryKey;
  }
}

export const keyboardShortcutsNormalizer = KeyboardShortcutsNormalizer.getInstance();
