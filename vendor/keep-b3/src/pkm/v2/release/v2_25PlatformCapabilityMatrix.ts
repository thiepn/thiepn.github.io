/**
 * V2.25 — Authoritative Platform Capability Matrix
 * 
 * Defines the comprehensive, verified capabilities and OS limitations across
 * Web, PWA, Windows, macOS, Linux, Android, iOS, and Tablet form factors.
 */

export type PlatformId = 'web' | 'pwa' | 'windows' | 'macos' | 'linux' | 'android' | 'ios' | 'tablet';

export type CapabilitySupportLevel =
  | 'Supported'
  | 'Supported with limitation'
  | 'Experimental'
  | 'Unsupported'
  | 'Not applicable';

export interface PlatformCapabilityRow {
  capabilityId: string;
  name: string;
  description: string;
  web: CapabilitySupportLevel;
  pwa: CapabilitySupportLevel;
  windows: CapabilitySupportLevel;
  macos: CapabilitySupportLevel;
  linux: CapabilitySupportLevel;
  android: CapabilitySupportLevel;
  ios: CapabilitySupportLevel;
  tablet: CapabilitySupportLevel;
  limitations: Record<PlatformId, string | null>;
}

export const V2_25_PLATFORM_CAPABILITIES_DATA: PlatformCapabilityRow[] = [
  {
    capabilityId: 'offline_vault',
    name: 'Offline Vault Storage',
    description: 'Local-first encrypted data storage and retrieval without requiring internet connectivity.',
    web: 'Supported',
    pwa: 'Supported',
    windows: 'Supported',
    macos: 'Supported',
    linux: 'Supported',
    android: 'Supported',
    ios: 'Supported',
    tablet: 'Supported',
    limitations: {
      web: 'Uses IndexedDB / OPFS; subject to browser storage eviction policies if disk space is low.',
      pwa: 'Uses IndexedDB with Service Worker Cache; persistent storage requested on install.',
      windows: 'Direct filesystem storage with SQLite / JSON canonical manifests.',
      macos: 'Direct filesystem storage in Application Support sandbox.',
      linux: 'Direct filesystem storage conforming to XDG standard paths (~/.local/share).',
      android: 'Scoped app-internal storage; protected from other apps.',
      ios: 'Sandboxed app container; excluded from cloud backup if user specifies.',
      tablet: 'Same as mobile/desktop according to runtime OS.',
    },
  },
  {
    capabilityId: 'local_files',
    name: 'Local Files Access',
    description: 'Reading and writing external files on the host device filesystem.',
    web: 'Supported with limitation',
    pwa: 'Supported with limitation',
    windows: 'Supported',
    macos: 'Supported',
    linux: 'Supported',
    android: 'Supported with limitation',
    ios: 'Supported with limitation',
    tablet: 'Supported with limitation',
    limitations: {
      web: 'Requires user invocation via File System Access API or standard file picker.',
      pwa: 'Requires File System Access API where supported by Chromium browsers.',
      windows: 'Full native disk access to user-selected folders.',
      macos: 'Full native disk access via security-scoped bookmarks.',
      linux: 'Full native POSIX filesystem access.',
      android: 'Scoped Storage via Storage Access Framework (SAF).',
      ios: 'Scoped document picker access via UIDocumentPickerViewController.',
      tablet: 'Scoped document picker / native access matching host OS.',
    },
  },
  {
    capabilityId: 'open_with',
    name: 'Open With (File Associations)',
    description: 'Launching the app to view or import .md, .pdf, or .pkmvault files.',
    web: 'Not applicable',
    pwa: 'Supported with limitation',
    windows: 'Supported',
    macos: 'Supported',
    linux: 'Supported',
    android: 'Supported',
    ios: 'Supported',
    tablet: 'Supported',
    limitations: {
      web: 'Web URLs cannot register OS file associations directly.',
      pwa: 'Chromium file_handlers manifest API where supported.',
      windows: 'Windows Registry file association (.md, .pkmvault, .pkmbak).',
      macos: 'macOS Info.plist CFBundleDocumentTypes registration.',
      linux: 'XDG MIME desktop entries and mimeapps.list registration.',
      android: 'Android Intent filters for text/markdown and application/octet-stream.',
      ios: 'iOS Uniform Type Identifiers (UTIs) in Info.plist.',
      tablet: 'Same as Android/iOS.',
    },
  },
  {
    capabilityId: 'share_in',
    name: 'Share In (Native Ingestion)',
    description: 'Receiving text, URLs, images, or files from the OS Share Sheet into Inbox / Quick Capture.',
    web: 'Not applicable',
    pwa: 'Supported with limitation',
    windows: 'Supported with limitation',
    macos: 'Supported',
    linux: 'Supported with limitation',
    android: 'Supported',
    ios: 'Supported',
    tablet: 'Supported',
    limitations: {
      web: 'Standard web tabs cannot act as native OS share targets.',
      pwa: 'Web Share Target API (manifest share_target) in supported standalone browsers.',
      windows: 'Windows Share target contract / clipboard watcher.',
      macos: 'macOS Share Extension & Services menu integration.',
      linux: 'D-Bus / CLI argument passing from external file managers.',
      android: 'Android ACTION_SEND and ACTION_SEND_MULTIPLE intent receiver.',
      ios: 'iOS Share Extension container communicating via App Groups.',
      tablet: 'Native share sheet integration with adaptive popover.',
    },
  },
  {
    capabilityId: 'share_out',
    name: 'Share Out (Export Sharing)',
    description: 'Exporting notes or reports directly to other apps via the OS Share Sheet.',
    web: 'Supported with limitation',
    pwa: 'Supported',
    windows: 'Supported',
    macos: 'Supported',
    linux: 'Supported with limitation',
    android: 'Supported',
    ios: 'Supported',
    tablet: 'Supported',
    limitations: {
      web: 'Navigator.share API if available and user-initiated; clipboard fallback.',
      pwa: 'Navigator.share API with file payload support.',
      windows: 'Windows DataTransferManager / clipboard copy.',
      macos: 'NSSharingServicePicker / AirDrop.',
      linux: 'XDG desktop portal / clipboard copy fallback.',
      android: 'Android Intent.createChooser with FileProvider URI.',
      ios: 'UIActivityViewController with sanitized temp file attachments.',
      tablet: 'Adaptive popover presentation for UIActivityViewController.',
    },
  },
  {
    capabilityId: 'notifications',
    name: 'Native Notifications',
    description: 'Local task reminders, review alerts, and system notifications with action buttons.',
    web: 'Supported with limitation',
    pwa: 'Supported with limitation',
    windows: 'Supported',
    macos: 'Supported',
    linux: 'Supported',
    android: 'Supported',
    ios: 'Supported',
    tablet: 'Supported',
    limitations: {
      web: 'Browser Web Notifications API; requires granted permission and active tab.',
      pwa: 'Web Push / Notifications API; cannot guarantee background fire if browser terminated.',
      windows: 'Windows Toast Notifications with WinRT action buttons.',
      macos: 'UNUserNotificationCenter with interactive action categories.',
      linux: 'org.freedesktop.Notifications D-Bus notification daemon.',
      android: 'Android NotificationCompat with notification channels and direct snooze actions.',
      ios: 'UNUserNotificationCenter with custom category actions.',
      tablet: 'Same as mobile/desktop.',
    },
  },
  {
    capabilityId: 'quick_capture',
    name: 'Quick Capture Entrypoint',
    description: 'Fast frictionless note/task creation shortcut accessible across the entire OS.',
    web: 'Supported with limitation',
    pwa: 'Supported with limitation',
    windows: 'Supported',
    macos: 'Supported',
    linux: 'Supported',
    android: 'Supported',
    ios: 'Supported',
    tablet: 'Supported',
    limitations: {
      web: 'In-app keyboard shortcut (Ctrl/Cmd+K or Alt+C) while tab is focused.',
      pwa: 'App shortcut icons on home screen; in-app hotkeys.',
      windows: 'Global OS hotkey (Win+Alt+N) via native window wrapper.',
      macos: 'Global OS hotkey (Cmd+Shift+C) and menu bar quick capture window.',
      linux: 'Global X11/Wayland shortcut hook via native bridge.',
      android: 'App Shortcuts launcher menu and Quick Settings tile.',
      ios: 'Home screen Quick Actions (3D Touch / Haptic Touch).',
      tablet: 'Hardware keyboard shortcut and floating capture button.',
    },
  },
  {
    capabilityId: 'deep_links',
    name: 'Deep Links Protocol',
    description: 'Opening specific notes, tasks, or views via personalos:// protocol or URL fragments.',
    web: 'Supported with limitation',
    pwa: 'Supported with limitation',
    windows: 'Supported',
    macos: 'Supported',
    linux: 'Supported',
    android: 'Supported',
    ios: 'Supported',
    tablet: 'Supported',
    limitations: {
      web: 'Standard URL query parameters and hash routing (#/note/id).',
      pwa: 'URL handling manifest spec and hash routing.',
      windows: 'Registered custom URI scheme personalos:// in Windows Registry.',
      macos: 'Registered URL scheme in Info.plist CFBundleURLTypes.',
      linux: 'Registered x-scheme-handler/personalos in desktop file.',
      android: 'Android App Links / Intent filter scheme personalos://.',
      ios: 'iOS Custom URL Schemes / Universal Links.',
      tablet: 'Same as mobile/desktop.',
    },
  },
  {
    capabilityId: 'background_work',
    name: 'Background Automations',
    description: 'Running scheduled automations, sync cycles, and database cleanups in background.',
    web: 'Unsupported',
    pwa: 'Supported with limitation',
    windows: 'Supported',
    macos: 'Supported',
    linux: 'Supported',
    android: 'Supported with limitation',
    ios: 'Supported with limitation',
    tablet: 'Supported with limitation',
    limitations: {
      web: 'Web tabs pause timers when backgrounded/inactive; automations run on tab focus catch-up.',
      pwa: 'Periodic Background Sync API (limited to installed Chromium PWAs on specific networks).',
      windows: 'Background task thread / tray process.',
      macos: 'Background dispatch queue / launchd daemon integration.',
      linux: 'Systemd user service or background daemon.',
      android: 'WorkManager scheduled jobs with battery optimization constraints.',
      ios: 'BGTaskScheduler; strictly budget-limited by iOS; catch-up execution on foreground.',
      tablet: 'Matches mobile OS background execution constraints.',
    },
  },
  {
    capabilityId: 'plugin_support',
    name: 'Plugin Runtime Sandbox',
    description: 'Executing user-installed extensions and declarative UI widgets.',
    web: 'Supported with limitation',
    pwa: 'Supported with limitation',
    windows: 'Supported',
    macos: 'Supported',
    linux: 'Supported',
    android: 'Supported with limitation',
    ios: 'Supported with limitation',
    tablet: 'Supported',
    limitations: {
      web: 'WebWorker / iframe sandbox with strict CSP and no native bridge access.',
      pwa: 'WebWorker sandbox with strict CSP.',
      windows: 'Node/Isolated-VM or WebWorker sandbox with explicit permission scopes.',
      macos: 'Isolated WebWorker sandbox with explicit permission scopes.',
      linux: 'Isolated WebWorker sandbox with explicit permission scopes.',
      android: 'WebWorker sandbox; native bridge access strictly blocked.',
      ios: 'JavaScriptCore / WebWorker sandbox; native bridge access strictly blocked.',
      tablet: 'Full declarative plugin UI support in sidebar/inspector panels.',
    },
  },
  {
    capabilityId: 'connector_oauth',
    name: 'Connector OAuth & API Sync',
    description: 'Connecting to third-party services (GitHub, Google, Readwise) via secure auth.',
    web: 'Supported with limitation',
    pwa: 'Supported',
    windows: 'Supported',
    macos: 'Supported',
    linux: 'Supported',
    android: 'Supported',
    ios: 'Supported',
    tablet: 'Supported',
    limitations: {
      web: 'OAuth popup window with postMessage callback handler.',
      pwa: 'OAuth redirect with state preservation in IndexedDB.',
      windows: 'Local loopback HTTP server (http://127.0.0.1:port/callback) or deep link.',
      macos: 'ASWebAuthenticationSession with custom URI scheme callback.',
      linux: 'Local loopback HTTP server or custom scheme callback.',
      android: 'Custom Tabs with deep link callback personalos://oauth/callback.',
      ios: 'ASWebAuthenticationSession with deep link callback.',
      tablet: 'Same as mobile/desktop.',
    },
  },
  {
    capabilityId: 'export_capabilities',
    name: 'Export Center (Open Formats)',
    description: 'Exporting Markdown, CSV, iCalendar (.ics), vCard (.vcf), BibTeX, and JSON.',
    web: 'Supported',
    pwa: 'Supported',
    windows: 'Supported',
    macos: 'Supported',
    linux: 'Supported',
    android: 'Supported',
    ios: 'Supported',
    tablet: 'Supported',
    limitations: {
      web: 'Browser blob download trigger.',
      pwa: 'Blob download / Web Share API with file attachment.',
      windows: 'Direct file save dialog via native file dialog.',
      macos: 'NSSavePanel direct file write.',
      linux: 'Native file save dialog via XDG Desktop Portal.',
      android: 'Android Storage Access Framework (SAF) CreateDocument intent.',
      ios: 'UIDocumentPickerViewController for export / UIDocumentInteractionController.',
      tablet: 'Full export capabilities with adaptive file picker.',
    },
  },
  {
    capabilityId: 'import_capabilities',
    name: '8-Stage Import Pipeline',
    description: 'Deterministic ingestion of Markdown archives, Obsidian vaults, Notion exports, etc.',
    web: 'Supported',
    pwa: 'Supported',
    windows: 'Supported',
    macos: 'Supported',
    linux: 'Supported',
    android: 'Supported',
    ios: 'Supported',
    tablet: 'Supported',
    limitations: {
      web: 'File input element with multi-file and folder (webkitdirectory) support.',
      pwa: 'Folder input / File System Access API where available.',
      windows: 'Native open directory / multi-file selection.',
      macos: 'NSOpenPanel directory / file selection.',
      linux: 'Native directory picker via GTK/KDE portal.',
      android: 'SAF OpenDocumentTree / multi-file selection.',
      ios: 'UIDocumentPickerViewController folder / file selection.',
      tablet: 'Full folder and drag-and-drop import.',
    },
  },
  {
    capabilityId: 'backup_recovery',
    name: 'Backup & Disaster Recovery',
    description: 'Deterministic .pkmbak creation, SHA-256 integrity verification, and safe restore.',
    web: 'Supported',
    pwa: 'Supported',
    windows: 'Supported',
    macos: 'Supported',
    linux: 'Supported',
    android: 'Supported',
    ios: 'Supported',
    tablet: 'Supported',
    limitations: {
      web: 'Client-side encrypted zip download and manual restore file picker.',
      pwa: 'Client-side backup generation with offline restore.',
      windows: 'Automated local disk backup rotation to user-configured directory.',
      macos: 'Automated local disk backup rotation in user-selected folder.',
      linux: 'Automated backup rotation in standard backup directory.',
      android: 'Manual backup creation to device Documents / cloud drive.',
      ios: 'Manual backup export to Files app / iCloud Drive folder.',
      tablet: 'Same as mobile/desktop.',
    },
  },
  {
    capabilityId: 'filesystem_mirror',
    name: 'Filesystem Directory Mirroring',
    description: 'Continuous mirroring between internal canonical store and an external Markdown directory.',
    web: 'Unsupported',
    pwa: 'Unsupported',
    windows: 'Supported',
    macos: 'Supported',
    linux: 'Supported',
    android: 'Unsupported',
    ios: 'Unsupported',
    tablet: 'Supported with limitation',
    limitations: {
      web: 'Browser security model prohibits continuous background filesystem watchers.',
      pwa: 'PWA does not support persistent background directory watchers without native wrapper.',
      windows: 'Native ReadDirectoryChangesW watcher with bounded debounce.',
      macos: 'FSEvents framework watcher with non-destructive atomic updates.',
      linux: 'inotify filesystem watcher with bounded file descriptors.',
      android: 'Operating system prohibits continuous background folder watching.',
      ios: 'iOS sandboxing prohibits continuous background folder monitoring.',
      tablet: 'Supported on Desktop tablets (e.g. Surface / iPad with native wrapper).',
    },
  },
  {
    capabilityId: 'biometric_unlock',
    name: 'Biometric Unlock (Face/Touch ID)',
    description: 'Unlocking encrypted vault credentials using device biometric sensors.',
    web: 'Supported with limitation',
    pwa: 'Supported with limitation',
    windows: 'Supported',
    macos: 'Supported',
    linux: 'Supported with limitation',
    android: 'Supported',
    ios: 'Supported',
    tablet: 'Supported',
    limitations: {
      web: 'WebAuthn / Passkey API where hardware authenticator is available.',
      pwa: 'WebAuthn platform authenticator.',
      windows: 'Windows Hello biometric authentication releasing DPAPI key.',
      macos: 'Touch ID / Apple Watch auth via LocalAuthentication framework releasing Keychain key.',
      linux: 'PAM / fprintd fingerprint authentication releasing Secret Service key.',
      android: 'BiometricPrompt API releasing Android Keystore master key.',
      ios: 'LocalAuthentication (Face ID / Touch ID) releasing Keychain item.',
      tablet: 'Face ID / Touch ID / Windows Hello depending on hardware.',
    },
  },
  {
    capabilityId: 'app_shortcuts_widgets',
    name: 'App Shortcuts & OS Widgets',
    description: 'Quick action launcher icons (Today, Quick Capture, Search) on the OS home screen.',
    web: 'Unsupported',
    pwa: 'Supported with limitation',
    windows: 'Supported with limitation',
    macos: 'Supported with limitation',
    linux: 'Supported with limitation',
    android: 'Supported',
    ios: 'Supported',
    tablet: 'Supported',
    limitations: {
      web: 'Standard web tabs cannot install OS launcher shortcuts.',
      pwa: 'Web App Manifest shortcuts (Today, Capture, Search).',
      windows: 'Windows Taskbar Jump Lists and Start Menu shortcuts.',
      macos: 'Dock menu items and Touch Bar shortcuts.',
      linux: 'Desktop Actions in .desktop entry file.',
      android: 'Android Dynamic Shortcuts and Today / Capture widgets.',
      ios: 'iOS Home Screen Quick Actions and Today Widget.',
      tablet: 'Adaptive widget and launcher shortcut presentation.',
    },
  },
];

export class V2_25PlatformCapabilityMatrixService {
  private static instance: V2_25PlatformCapabilityMatrixService | null = null;

  public static getInstance(): V2_25PlatformCapabilityMatrixService {
    if (!V2_25PlatformCapabilityMatrixService.instance) {
      V2_25PlatformCapabilityMatrixService.instance = new V2_25PlatformCapabilityMatrixService();
    }
    return V2_25PlatformCapabilityMatrixService.instance;
  }

  public getAllCapabilities(): PlatformCapabilityRow[] {
    return V2_25_PLATFORM_CAPABILITIES_DATA;
  }

  public getCapability(id: string): PlatformCapabilityRow | undefined {
    return V2_25_PLATFORM_CAPABILITIES_DATA.find((c) => c.capabilityId === id);
  }

  public getPlatformCapabilities(platform: PlatformId): Array<{
    capability: PlatformCapabilityRow;
    support: CapabilitySupportLevel;
    limitation: string | null;
  }> {
    return V2_25_PLATFORM_CAPABILITIES_DATA.map((row) => ({
      capability: row,
      support: row[platform],
      limitation: row.limitations[platform],
    }));
  }

  /**
   * Generates a clean Markdown table representation of the matrix.
   */
  public generateMarkdownMatrix(): string {
    const headers = [
      '| Capability | Web | PWA | Windows | macOS | Linux | Android | iOS | Tablet |',
      '| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |',
    ];

    const rows = V2_25_PLATFORM_CAPABILITIES_DATA.map((r) => {
      const format = (lvl: CapabilitySupportLevel) => {
        switch (lvl) {
          case 'Supported':
            return '✅ Supported';
          case 'Supported with limitation':
            return '⚠️ Limited';
          case 'Experimental':
            return '🧪 Experim.';
          case 'Unsupported':
            return '❌ Unsupp.';
          case 'Not applicable':
            return '➖ N/A';
        }
      };

      return `| ${r.name} | ${format(r.web)} | ${format(r.pwa)} | ${format(r.windows)} | ${format(r.macos)} | ${format(r.linux)} | ${format(r.android)} | ${format(r.ios)} | ${format(r.tablet)} |`;
    });

    return [...headers, ...rows].join('\n');
  }
}

export const v2_25PlatformMatrixService = V2_25PlatformCapabilityMatrixService.getInstance();
export const v2_25PlatformCapabilityMatrix = v2_25PlatformMatrixService;
