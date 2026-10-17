/**
 * Phase P41: Sandboxed Plugin Architecture & Extension Platform
 * Core Plugin System Types
 */

export type PluginId = string; // e.g. "org.pkm.word-count"
export type PluginApiVersion = '1';

export type PluginCategory =
  | 'utility'
  | 'workspace'
  | 'editor'
  | 'import-export'
  | 'theme'
  | 'analytics';

export type PluginStatus =
  | 'installed'
  | 'enabled'
  | 'disabled'
  | 'incompatible'
  | 'permission_required'
  | 'crashed'
  | 'blocked';

export type PermissionRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type PluginPermission =
  | 'commands.register'
  | 'workspace.view'
  | 'notes.read:selected'
  | 'notes.read:current'
  | 'notes.read:metadata'
  | 'notes.read:all'
  | 'notes.write:selected'
  | 'notes.write:current'
  | 'notes.write:create'
  | 'tasks.read'
  | 'tasks.write'
  | 'calendar.read'
  | 'calendar.write'
  | 'people.read'
  | 'people.write'
  | 'finance.read'
  | 'finance.write'
  | 'health.read'
  | 'health.write'
  | 'travel.read'
  | 'travel.write'
  | 'assets.read'
  | 'assets.write'
  | 'decisions.read'
  | 'decisions.write'
  | 'context.read.current'
  | 'ai.invoke'
  | 'network.request'
  | 'filesystem.import'
  | 'notifications.schedule'
  | 'search.metadata'
  | 'import.register'
  | 'export.register'
  | 'events.subscribe'
  | 'storage.private'
  | 'editor.decorations';

export interface PermissionDefinition {
  id: PluginPermission;
  name: string;
  description: string;
  riskLevel: PermissionRiskLevel;
  humanReadableGrant: string;
  warningNote?: string;
}

export interface PluginManifestContributionCommands {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  shortcut?: string;
  requiresSelection?: boolean;
  requiresActiveNote?: boolean;
}

export interface PluginManifestContributionViews {
  id: string;
  title: string;
  icon?: string;
  entryHtml?: string;
  supportsMobile?: boolean;
}

export interface PluginManifestContributionAdapters {
  id: string;
  name: string;
  supportedExtensions: string[];
  type: 'import' | 'export';
}

export interface PluginSettingsField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select';
  defaultValue: any;
  options?: { label: string; value: any }[];
  description?: string;
}

export interface PluginManifest {
  id: PluginId;
  name: string;
  version: string;
  apiVersion: PluginApiVersion;
  description: string;
  author: {
    name: string;
    url?: string;
    email?: string;
  };
  category: PluginCategory;
  entryWorker?: string; // e.g. "worker.js"
  entryUi?: string; // e.g. "ui/index.html"
  permissions: PluginPermission[];
  minAppVersion?: string;
  maxApiVersion?: string;
  activationEvents?: string[]; // e.g. ["onCommand:count", "onView:stats"]
  contributions?: {
    commands?: PluginManifestContributionCommands[];
    views?: PluginManifestContributionViews[];
    adapters?: PluginManifestContributionAdapters[];
    settings?: PluginSettingsField[];
  };
  supportsMobile?: boolean;
  license?: string;
}

export interface InstalledPlugin {
  manifest: PluginManifest;
  status: PluginStatus;
  installedAt: number;
  updatedAt: number;
  grantedPermissions: PluginPermission[];
  workerCode?: string;
  uiHtml?: string;
  packageHash: string;
  isDevelopment?: boolean;
  crashCount: number;
  lastCrashReason?: string;
  lastCrashTimestamp?: number;
  storageUsageBytes: number;
  settings: Record<string, any>;
  origin: 'local_package' | 'developer_mode' | 'sample';
}

export interface PluginLogEntry {
  id: string;
  pluginId: PluginId;
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  details?: any;
}

export interface PluginDiagnosticReport {
  pluginId: PluginId;
  name: string;
  version: string;
  status: PluginStatus;
  grantedPermissions: PluginPermission[];
  crashes: number;
  storageBytes: number;
  recentLogs: PluginLogEntry[];
}
