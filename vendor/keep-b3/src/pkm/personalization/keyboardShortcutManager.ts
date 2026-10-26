/**
 * Keyboard Shortcut Manager
 * 
 * Central registry and conflict resolution engine for keyboard shortcuts:
 * - OS Normalization: Maps 'Mod' to 'Cmd' on macOS and 'Ctrl' on Windows/Linux.
 * - Conflict Detection: Flags duplicate or overlapping key bindings.
 * - Reserved Keys Protection: Warns against browser collisions (e.g. Ctrl+W, Ctrl+T, Ctrl+N).
 * - Safe Persistence: Allows per-device or synced key overrides with instant reset.
 */

import { ShortcutBinding, ShortcutCategory, ShortcutConflict } from './personalizationTypes';
import { preferenceService } from './preferenceService';

const SHORTCUTS_STORAGE_KEY = 'keyboard_shortcuts';

export const DEFAULT_SHORTCUTS: ShortcutBinding[] = [
  { actionId: 'nav:open-command-palette', keys: 'Mod+K', category: 'global', label: 'Command Palette', isCustom: false },
  { actionId: 'nav:open-search', keys: 'Mod+Shift+F', category: 'global', label: 'Global Search', isCustom: false },
  { actionId: 'nav:open-home', keys: 'Mod+Shift+H', category: 'navigation', label: 'Go to Home', isCustom: false },
  { actionId: 'nav:open-inbox', keys: 'Mod+Shift+I', category: 'navigation', label: 'Universal Inbox', isCustom: false },
  { actionId: 'resource:new-note', keys: 'Mod+Alt+N', category: 'editor', label: 'Create New Note', isCustom: false },
  { actionId: 'resource:open-daily-note', keys: 'Mod+Shift+D', category: 'editor', label: 'Open Daily Note', isCustom: false },
  { actionId: 'resource:quick-capture', keys: 'Mod+Shift+C', category: 'editor', label: 'Quick Capture', isCustom: false },
  { actionId: 'workspace:split-vertical', keys: 'Mod+\\', category: 'workspace', label: 'Split Workspace', isCustom: false },
  { actionId: 'tools:open-settings', keys: 'Mod+,', category: 'global', label: 'Open Settings', isCustom: false },
  { actionId: 'tools:lock-vault', keys: 'Mod+Shift+L', category: 'global', label: 'Lock Vault', isCustom: false },
];

export const RESERVED_BROWSER_KEYS = ['Mod+W', 'Mod+T', 'Mod+N', 'Mod+Q', 'Mod+R', 'F5', 'Mod+Shift+R'];

export class KeyboardShortcutManager {
  private isMac: boolean;

  constructor() {
    this.isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  }

  public getShortcuts(): ShortcutBinding[] {
    const userCustom = preferenceService.get<ShortcutBinding[]>(SHORTCUTS_STORAGE_KEY, [], 'global-synced');
    const customMap = new Map(userCustom.map((s) => [s.actionId, s]));

    const merged = DEFAULT_SHORTCUTS.map((def) => {
      if (customMap.has(def.actionId)) {
        return customMap.get(def.actionId)!;
      }
      return def;
    });

    // Add any plugin or custom actions not in defaults
    userCustom.forEach((custom) => {
      if (!DEFAULT_SHORTCUTS.some((d) => d.actionId === custom.actionId)) {
        merged.push(custom);
      }
    });

    return merged;
  }

  /**
   * Normalizes a keyboard display string for the current operating system
   */
  public formatShortcutForDisplay(keys: string): string {
    if (!keys) return '';
    if (this.isMac) {
      return keys
        .replace(/Mod\+/g, '⌘')
        .replace(/Alt\+/g, '⌥')
        .replace(/Shift\+/g, '⇧')
        .replace(/Ctrl\+/g, '⌃');
    } else {
      return keys
        .replace(/Mod\+/g, 'Ctrl+')
        .replace(/Alt\+/g, 'Alt+')
        .replace(/Shift\+/g, 'Shift+');
    }
  }

  /**
   * Checks if an incoming KeyboardEvent matches a shortcut definition
   */
  public matchesEvent(keys: string, event: KeyboardEvent): boolean {
    const parts = keys.split('+').map((p) => p.trim().toLowerCase());
    const wantsMod = parts.includes('mod') || (this.isMac ? parts.includes('cmd') : parts.includes('ctrl'));
    const wantsCtrl = parts.includes('ctrl');
    const wantsAlt = parts.includes('alt') || parts.includes('opt');
    const wantsShift = parts.includes('shift');

    const keyPart = parts.find((p) => !['mod', 'cmd', 'ctrl', 'alt', 'opt', 'shift'].includes(p));

    const modPressed = this.isMac ? event.metaKey : event.ctrlKey;
    if (wantsMod && !modPressed) return false;
    if (wantsCtrl && !event.ctrlKey) return false;
    if (wantsAlt && !event.altKey) return false;
    if (wantsShift && !event.shiftKey) return false;

    if (!wantsMod && (event.metaKey || (this.isMac ? false : event.ctrlKey))) return false;
    if (!wantsAlt && event.altKey) return false;
    if (!wantsShift && event.shiftKey) return false;

    if (!keyPart) return false;

    const eventKey = event.key.toLowerCase();
    return eventKey === keyPart || (keyPart === '\\' && event.key === '\\') || (keyPart === ',' && event.key === ',');
  }

  /**
   * Validates and checks for conflicts before binding
   */
  public checkConflict(actionId: string, newKeys: string): ShortcutConflict | null {
    const shortcuts = this.getShortcuts();
    const normalizedNew = newKeys.toLowerCase().replace(/cmd/g, 'mod').replace(/control/g, 'ctrl');

    const conflict = shortcuts.find((s) => {
      if (s.actionId === actionId) return false;
      const normalizedExisting = s.keys.toLowerCase().replace(/cmd/g, 'mod').replace(/control/g, 'ctrl');
      return normalizedExisting === normalizedNew;
    });

    if (conflict) {
      return {
        keyCombination: newKeys,
        existingActionId: conflict.actionId,
        existingLabel: conflict.label,
        newActionId: actionId,
        newLabel: actionId,
      };
    }

    return null;
  }

  public isReservedBrowserKey(keys: string): boolean {
    const norm = keys.toUpperCase().replace(/CMD/g, 'MOD').replace(/CTRL/g, 'MOD');
    return RESERVED_BROWSER_KEYS.some((res) => norm === res.toUpperCase());
  }

  public async setShortcut(actionId: string, keys: string, label: string, category: ShortcutCategory = 'global'): Promise<void> {
    const current = this.getShortcuts();
    const filtered = current.filter((s) => s.actionId !== actionId);

    const updated: ShortcutBinding[] = [
      ...filtered,
      {
        actionId,
        keys,
        category,
        label,
        isCustom: true,
      },
    ];

    await preferenceService.set(SHORTCUTS_STORAGE_KEY, updated, 'global-synced');
  }

  public async resetShortcuts(): Promise<void> {
    await preferenceService.reset(SHORTCUTS_STORAGE_KEY, DEFAULT_SHORTCUTS, 'global-synced');
  }
}

export const keyboardShortcutManager = new KeyboardShortcutManager();
