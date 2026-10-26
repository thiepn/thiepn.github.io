/**
 * P46 — Native Desktop App, OS Integration & Reliable Background Services
 * Core TypeScript definitions and schemas for the native desktop capabilities bridge.
 */

export type DesktopPlatform = 'web' | 'windows' | 'macos' | 'linux';

export type DesktopRuntimeEnvironment = 'browser' | 'pwa' | 'tauri' | 'electron';

export type FilesystemWatcherStatus = 'inactive' | 'watching' | 'scanning' | 'up_to_date' | 'conflicts' | 'error' | 'path_missing';

export interface NativeWatcherEvent {
  type: 'created' | 'modified' | 'removed' | 'renamed' | 'overflow' | 'rescan_required';
  relativePath: string;
  oldRelativePath?: string;
  timestamp: number;
}

export interface NativeFilesystemCapability {
  isAvailable: boolean;
  isWatching: boolean;
  activeRootId: string | null;
  activeRootPath: string | null;
  watcherStatus: FilesystemWatcherStatus;
  errorMessage?: string;
}

export interface NativeNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  sound?: boolean;
  resourceId?: string;
  resourceType?: 'note' | 'task' | 'reminder' | 'sync' | 'system';
  isSensitive?: boolean;
}

export interface NativeNotificationCapability {
  isAvailable: boolean;
  permissionGranted: boolean;
}

export interface NativeCredentialCapability {
  isAvailable: boolean;
  backendName: 'Windows Credential Manager' | 'macOS Keychain' | 'Linux Secret Service' | 'Encrypted Vault Fallback' | 'Session Memory';
  isLocked: boolean;
}

export interface NativeShortcutCapability {
  isAvailable: boolean;
  registeredShortcuts: Record<string, string>; // e.g. { quick_capture: 'CmdOrCtrl+Shift+Space' }
  conflictDetected?: boolean;
}

export interface NativeTrayCapability {
  isAvailable: boolean;
  isVisible: boolean;
  hasUnreadReminders: boolean;
  hasConflicts: boolean;
  isBackgroundPaused: boolean;
}

export interface NativeProtocolCapability {
  isAvailable: boolean;
  registeredScheme: string; // 'pkm'
  lastHandledUri: string | null;
}

export interface NativeLifecycleCapability {
  isDesktop: boolean;
  platform: DesktopPlatform;
  runtime: DesktopRuntimeEnvironment;
  isSingleInstance: boolean;
  windowVisible: boolean;
  closeToTray: boolean;
  startAtLogin: boolean;
  lockOnSessionLock: boolean;
  isBackgroundPaused: boolean;
  appVersion: string;
}

export interface DesktopSettingsConfig {
  startAtLogin: boolean;
  closeToTray: boolean;
  launchMinimized: boolean;
  globalQuickCaptureEnabled: boolean;
  globalQuickCaptureShortcut: string;
  lockOnOsSessionLock: boolean;
  pauseBackgroundActivity: boolean;
  nativeWatcherEnabled: boolean;
  nativeNotificationsEnabled: boolean;
  useOsCredentialStore: boolean;
}

export interface ParsedProtocolUri {
  isValid: boolean;
  action: 'note' | 'today' | 'collection' | 'reference' | 'capture' | 'search' | 'unknown';
  resourceId?: string;
  queryParam?: string;
  rawUri: string;
  error?: string;
}

export interface DesktopDiagnosticItem {
  id: string;
  name: string;
  status: 'passed' | 'warning' | 'failed' | 'skipped' | 'running';
  details: string;
  timestamp: string;
}

export interface DesktopDiagnosticsReport {
  timestamp: string;
  platform: DesktopPlatform;
  runtime: DesktopRuntimeEnvironment;
  isDesktop: boolean;
  items: DesktopDiagnosticItem[];
  summary: {
    total: number;
    passed: number;
    warnings: number;
    failed: number;
  };
}
