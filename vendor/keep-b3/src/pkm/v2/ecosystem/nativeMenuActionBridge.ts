/**
 * V2.12 Native Menu Action Bridge
 * 
 * Maps desktop OS application menus (File, Edit, View, Navigate, Window, Help)
 * strictly to the canonical V2 Action Registry and Command Registry.
 */

export interface NativeMenuItem {
  id: string;
  label: string;
  commandId?: string;
  actionId?: string;
  shortcut?: string;
  role?: 'undo' | 'redo' | 'cut' | 'copy' | 'paste' | 'selectAll' | 'minimize' | 'close' | 'quit';
  type?: 'normal' | 'separator' | 'submenu' | 'checkbox';
  checked?: boolean;
  enabled: boolean;
  submenu?: NativeMenuItem[];
}

export interface NativeMenuDefinition {
  id: 'file' | 'edit' | 'view' | 'navigate' | 'window' | 'help';
  label: string;
  items: NativeMenuItem[];
}

export class NativeMenuActionBridge {
  private static instance: NativeMenuActionBridge | null = null;

  private constructor() {}

  public static getInstance(): NativeMenuActionBridge {
    if (!NativeMenuActionBridge.instance) {
      NativeMenuActionBridge.instance = new NativeMenuActionBridge();
    }
    return NativeMenuActionBridge.instance;
  }

  /**
   * Generates the complete desktop native menu tree hooked to active PKM actions
   */
  public generateNativeMenus(context: {
    isVaultLocked: boolean;
    hasActiveNote: boolean;
    sidebarOpen: boolean;
    theme: 'light' | 'dark' | 'system';
    canUndo: boolean;
    canRedo: boolean;
  }): NativeMenuDefinition[] {
    const isLocked = context.isVaultLocked;

    return [
      {
        id: 'file',
        label: 'File',
        items: [
          {
            id: 'file:new-note',
            label: 'New Note',
            commandId: 'note:create',
            shortcut: 'Mod+N',
            enabled: !isLocked,
          },
          {
            id: 'file:quick-capture',
            label: 'Quick Capture...',
            commandId: 'capture:quick',
            shortcut: 'Mod+Shift+N',
            enabled: true,
          },
          { type: 'separator', id: 'sep1', label: '', enabled: true },
          {
            id: 'file:import',
            label: 'Import Files...',
            commandId: 'import:markdown-folder',
            enabled: !isLocked,
          },
          {
            id: 'file:backup',
            label: 'Backup Vault...',
            commandId: 'backup:create',
            enabled: !isLocked,
          },
          {
            id: 'file:export-vault',
            label: 'Export Vault (Markdown)...',
            commandId: 'export:all-markdown-zip',
            enabled: !isLocked,
          },
          { type: 'separator', id: 'sep2', label: '', enabled: true },
          {
            id: 'file:lock-vault',
            label: isLocked ? 'Vault is Locked' : 'Lock Vault',
            commandId: 'vault:lock',
            shortcut: 'Mod+Alt+L',
            enabled: !isLocked,
          },
          {
            id: 'file:settings',
            label: 'Settings...',
            commandId: 'settings:open',
            shortcut: 'Mod+,',
            enabled: true,
          },
          { type: 'separator', id: 'sep3', label: '', enabled: true },
          {
            id: 'file:quit',
            label: 'Quit KeepNotes',
            role: 'quit',
            shortcut: 'Mod+Q',
            enabled: true,
          },
        ],
      },
      {
        id: 'edit',
        label: 'Edit',
        items: [
          {
            id: 'edit:undo',
            label: 'Undo',
            role: 'undo',
            shortcut: 'Mod+Z',
            enabled: context.canUndo && !isLocked,
          },
          {
            id: 'edit:redo',
            label: 'Redo',
            role: 'redo',
            shortcut: 'Mod+Shift+Z',
            enabled: context.canRedo && !isLocked,
          },
          { type: 'separator', id: 'sep_edit_1', label: '', enabled: true },
          { id: 'edit:cut', label: 'Cut', role: 'cut', shortcut: 'Mod+X', enabled: true },
          { id: 'edit:copy', label: 'Copy', role: 'copy', shortcut: 'Mod+C', enabled: true },
          { id: 'edit:paste', label: 'Paste', role: 'paste', shortcut: 'Mod+V', enabled: true },
          { id: 'edit:select-all', label: 'Select All', role: 'selectAll', shortcut: 'Mod+A', enabled: true },
          { type: 'separator', id: 'sep_edit_2', label: '', enabled: true },
          {
            id: 'edit:find',
            label: 'Search Notes & Content...',
            commandId: 'search:global',
            shortcut: 'Mod+Shift+F',
            enabled: !isLocked,
          },
        ],
      },
      {
        id: 'view',
        label: 'View',
        items: [
          {
            id: 'view:toggle-sidebar',
            label: context.sidebarOpen ? 'Hide Sidebar' : 'Show Sidebar',
            commandId: 'workspace:toggle-sidebar',
            shortcut: 'Mod+\\',
            enabled: true,
          },
          {
            id: 'view:command-palette',
            label: 'Command Palette...',
            commandId: 'command:palette',
            shortcut: 'Mod+K',
            enabled: true,
          },
          {
            id: 'view:quick-switcher',
            label: 'Quick Switcher...',
            commandId: 'search:quick-switcher',
            shortcut: 'Mod+O',
            enabled: !isLocked,
          },
          { type: 'separator', id: 'sep_view_1', label: '', enabled: true },
          {
            id: 'view:theme-toggle',
            label: 'Toggle Dark / Light Theme',
            commandId: 'theme:toggle',
            enabled: true,
          },
        ],
      },
      {
        id: 'navigate',
        label: 'Navigate',
        items: [
          {
            id: 'nav:home',
            label: 'Go to Home',
            commandId: 'nav:home',
            shortcut: 'Mod+Shift+H',
            enabled: !isLocked,
          },
          {
            id: 'nav:today',
            label: 'Go to Today / Agenda',
            commandId: 'nav:today',
            shortcut: 'Mod+Shift+T',
            enabled: !isLocked,
          },
          {
            id: 'nav:inbox',
            label: 'Go to Universal Inbox',
            commandId: 'inbox:open',
            enabled: !isLocked,
          },
          {
            id: 'nav:projects',
            label: 'Go to Projects',
            commandId: 'nav:projects',
            enabled: !isLocked,
          },
        ],
      },
      {
        id: 'window',
        label: 'Window',
        items: [
          { id: 'win:minimize', label: 'Minimize', role: 'minimize', shortcut: 'Mod+M', enabled: true },
          { id: 'win:close', label: 'Close Window', role: 'close', shortcut: 'Mod+W', enabled: true },
          { type: 'separator', id: 'sep_win_1', label: '', enabled: true },
          {
            id: 'win:split-vertical',
            label: 'Split Pane Vertically',
            commandId: 'workspace:split-vertical',
            enabled: context.hasActiveNote && !isLocked,
          },
          {
            id: 'win:split-horizontal',
            label: 'Split Pane Horizontally',
            commandId: 'workspace:split-horizontal',
            enabled: context.hasActiveNote && !isLocked,
          },
        ],
      },
      {
        id: 'help',
        label: 'Help',
        items: [
          {
            id: 'help:shortcuts',
            label: 'Keyboard Shortcuts Reference',
            commandId: 'help:shortcuts',
            shortcut: 'Mod+/',
            enabled: true,
          },
          {
            id: 'help:maintenance-diagnostics',
            label: 'Maintenance & Platform Hub...',
            commandId: 'tools:v2_11-maintenance-diagnostics',
            shortcut: 'Mod+Alt+M',
            enabled: true,
          },
          {
            id: 'help:plugins',
            label: 'Plugin Manager...',
            commandId: 'plugins:open-manager',
            enabled: true,
          },
        ],
      },
    ];
  }
}

export const nativeMenuActionBridge = NativeMenuActionBridge.getInstance();
