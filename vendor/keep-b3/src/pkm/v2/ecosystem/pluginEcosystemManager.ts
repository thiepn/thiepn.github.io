/**
 * V2.12 Plugin Ecosystem Manager
 * 
 * Manages plugin lifecycle, atomic package installations & updates,
 * permission escalation reviews, and Safe Mode fault containment.
 */

export interface EcosystemPluginManifest {
  id: string;
  name: string;
  version: string;
  apiVersion: string;
  description: string;
  author: string;
  permissions: Array<'storage' | 'read_resources' | 'write_notes' | 'network' | 'ui_panels' | 'notifications'>;
  entryPoint: string;
}

export type PluginState = 'active' | 'disabled' | 'safe_mode_quarantined' | 'escalation_pending_review' | 'error';

export interface InstalledPluginRecord {
  manifest: EcosystemPluginManifest;
  state: PluginState;
  installedAt: string;
  updatedAt: string;
  grantedPermissions: string[];
  crashCount: number;
  lastError?: string;
  pendingUpdateManifest?: EcosystemPluginManifest;
}

export class PluginEcosystemManager {
  private static instance: PluginEcosystemManager | null = null;
  private plugins: Map<string, InstalledPluginRecord> = new Map();

  private constructor() {
    this.seedDefaultPlugins();
  }

  public static getInstance(): PluginEcosystemManager {
    if (!PluginEcosystemManager.instance) {
      PluginEcosystemManager.instance = new PluginEcosystemManager();
    }
    return PluginEcosystemManager.instance;
  }

  private seedDefaultPlugins(): void {
    const sample: InstalledPluginRecord = {
      manifest: {
        id: 'org.keepnotes.readwise-bridge',
        name: 'Readwise & Web Highlights Sync',
        version: '1.4.0',
        apiVersion: '2.0.0',
        description: 'Syncs book highlights and reader articles into your Universal Inbox.',
        author: 'KeepNotes Ecosystem Team',
        permissions: ['storage', 'read_resources', 'write_notes', 'network'],
        entryPoint: 'index.js',
      },
      state: 'active',
      installedAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-10T00:00:00Z',
      grantedPermissions: ['storage', 'read_resources', 'write_notes', 'network'],
      crashCount: 0,
    };
    this.plugins.set(sample.manifest.id, sample);
  }

  /**
   * Installs a new plugin package atomically
   */
  public installPlugin(manifest: EcosystemPluginManifest, grantedPermissions: string[]): InstalledPluginRecord {
    const record: InstalledPluginRecord = {
      manifest,
      state: 'active',
      installedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      grantedPermissions,
      crashCount: 0,
    };

    this.plugins.set(manifest.id, record);
    return record;
  }

  /**
   * Evaluates an incoming update for permission escalation
   */
  public stageUpdate(pluginId: string, newManifest: EcosystemPluginManifest): {
    requiresUserReview: boolean;
    escalatedPermissions: string[];
    record: InstalledPluginRecord;
  } {
    const existing = this.plugins.get(pluginId);
    if (!existing) {
      throw new Error(`Plugin "${pluginId}" not found for update.`);
    }

    // Check for newly requested permissions that were not previously granted
    const escalated = newManifest.permissions.filter(p => !existing.grantedPermissions.includes(p));

    if (escalated.length > 0) {
      existing.pendingUpdateManifest = newManifest;
      existing.state = 'escalation_pending_review';
      return {
        requiresUserReview: true,
        escalatedPermissions: escalated,
        record: existing,
      };
    }

    // Safe update: apply immediately
    existing.manifest = newManifest;
    existing.updatedAt = new Date().toISOString();
    existing.pendingUpdateManifest = undefined;
    return {
      requiresUserReview: false,
      escalatedPermissions: [],
      record: existing,
    };
  }

  /**
   * Approves permission escalation and applies staged update
   */
  public approveUpdate(pluginId: string, approvedPermissions: string[]): InstalledPluginRecord {
    const existing = this.plugins.get(pluginId);
    if (!existing || !existing.pendingUpdateManifest) {
      throw new Error(`No pending update for plugin "${pluginId}".`);
    }

    existing.manifest = existing.pendingUpdateManifest;
    existing.grantedPermissions = Array.from(new Set([...existing.grantedPermissions, ...approvedPermissions]));
    existing.updatedAt = new Date().toISOString();
    existing.pendingUpdateManifest = undefined;
    existing.state = 'active';
    return existing;
  }

  /**
   * Records a worker crash and triggers Safe Mode quarantine if threshold exceeded
   */
  public recordPluginCrash(pluginId: string, error: string): void {
    const existing = this.plugins.get(pluginId);
    if (!existing) return;

    existing.crashCount += 1;
    existing.lastError = error;

    if (existing.crashCount >= 3) {
      existing.state = 'safe_mode_quarantined';
    }
  }

  /**
   * Manually toggles plugin active / disabled state
   */
  public togglePlugin(pluginId: string): boolean {
    const existing = this.plugins.get(pluginId);
    if (!existing) return false;

    if (existing.state === 'active') {
      existing.state = 'disabled';
    } else {
      existing.state = 'active';
      existing.crashCount = 0;
      existing.lastError = undefined;
    }
    return true;
  }

  public getAllPlugins(): InstalledPluginRecord[] {
    return Array.from(this.plugins.values());
  }

  public getPlugin(id: string): InstalledPluginRecord | undefined {
    return this.plugins.get(id);
  }
}

export const pluginEcosystemManager = PluginEcosystemManager.getInstance();
