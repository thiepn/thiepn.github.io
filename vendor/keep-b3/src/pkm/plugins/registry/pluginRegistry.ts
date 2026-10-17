/**
 * Phase P41: Central Plugin Registry & Lifecycle Manager
 * Coordinates plugin loading, sandboxing, contribution tracking, Safe Mode,
 * and command dispatching.
 */

import {
  InstalledPlugin,
  PluginDiagnosticReport,
  PluginId,
  PluginLogEntry,
  PluginManifest,
  PluginPermission,
  PluginStatus,
} from '../types';
import { PluginWorkerSandbox } from '../sandbox/pluginWorkerSandbox';
import { CapabilityDispatcher, DispatcherContext } from '../bridge/capabilityDispatcher';
import { pluginStorageService } from '../storage/pluginStorageService';

import { capabilityDispatcherRef } from './pluginRegistryHelper';

const STORAGE_KEY_PLUGINS = 'keepnotes_pkm_plugins_v1';
const STORAGE_KEY_SAFE_MODE = 'keepnotes_pkm_plugin_safe_mode';
const MAX_LOGS_PER_PLUGIN = 100;
const MAX_CRASH_THRESHOLD = 3;

export class PluginRegistry {
  private plugins: Map<PluginId, InstalledPlugin> = new Map();
  private activeSandboxes: Map<PluginId, PluginWorkerSandbox> = new Map();
  private pluginLogs: Map<PluginId, PluginLogEntry[]> = new Map();
  private dispatcher: CapabilityDispatcher | null = null;
  private isSafeMode = false;
  private isInitialized = false;
  private onStateChangeListeners: Array<() => void> = [];

  constructor() {}

  public initialize(context: DispatcherContext): void {
    if (this.isInitialized) return;
    this.dispatcher = new CapabilityDispatcher(context);
    capabilityDispatcherRef.current = this.dispatcher;

    // Check if Safe Mode was activated
    try {
      this.isSafeMode = localStorage.getItem(STORAGE_KEY_SAFE_MODE) === 'true';
    } catch (e) {}

    this.loadInstalledPluginsFromStorage();
    this.isInitialized = true;

    if (!this.isSafeMode) {
      this.startEnabledPlugins();
    }
  }

  public subscribe(listener: () => void): () => void {
    this.onStateChangeListeners.push(listener);
    return () => {
      this.onStateChangeListeners = this.onStateChangeListeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    this.onStateChangeListeners.forEach((l) => {
      try {
        l();
      } catch (e) {}
    });
  }

  public getIsSafeMode(): boolean {
    return this.isSafeMode;
  }

  public setSafeMode(enabled: boolean): void {
    this.isSafeMode = enabled;
    try {
      if (enabled) {
        localStorage.setItem(STORAGE_KEY_SAFE_MODE, 'true');
        // Terminate all running sandboxes
        for (const [id] of this.activeSandboxes) {
          this.stopSandbox(id);
        }
      } else {
        localStorage.removeItem(STORAGE_KEY_SAFE_MODE);
        this.startEnabledPlugins();
      }
    } catch (e) {}
    this.notify();
  }

  public getInstalledPlugins(): InstalledPlugin[] {
    return Array.from(this.plugins.values());
  }

  public getPlugin(pluginId: PluginId): InstalledPlugin | undefined {
    return this.plugins.get(pluginId);
  }

  public async installPlugin(
    manifest: PluginManifest,
    grantedPermissions: PluginPermission[],
    workerCode?: string,
    uiHtml?: string,
    packageHash = 'unknown',
    isDevelopment = false,
    origin: InstalledPlugin['origin'] = 'local_package'
  ): Promise<InstalledPlugin> {
    const existing = this.plugins.get(manifest.id);

    const installed: InstalledPlugin = {
      manifest,
      status: 'enabled',
      installedAt: existing ? existing.installedAt : Date.now(),
      updatedAt: Date.now(),
      grantedPermissions,
      workerCode,
      uiHtml,
      packageHash,
      isDevelopment,
      crashCount: 0,
      storageUsageBytes: 0,
      settings: existing?.settings || {},
      origin,
    };

    this.plugins.set(manifest.id, installed);
    this.savePluginsToStorage();

    this.log(manifest.id, 'info', `Plugin "${manifest.name}" v${manifest.version} installed successfully.`);

    if (!this.isSafeMode && installed.status === 'enabled') {
      await this.startSandbox(installed);
    }

    this.notify();
    return installed;
  }

  public async enablePlugin(pluginId: PluginId): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return;

    plugin.status = 'enabled';
    plugin.crashCount = 0;
    this.savePluginsToStorage();

    if (!this.isSafeMode) {
      await this.startSandbox(plugin);
    }
    this.notify();
  }

  public async disablePlugin(pluginId: PluginId): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return;

    plugin.status = 'disabled';
    this.stopSandbox(pluginId);
    this.savePluginsToStorage();
    this.notify();
  }

  public async uninstallPlugin(pluginId: PluginId, clearStorage = true): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return;

    this.stopSandbox(pluginId);
    if (clearStorage) {
      await pluginStorageService.clearPluginStorage(pluginId);
    }

    this.plugins.delete(pluginId);
    this.pluginLogs.delete(pluginId);
    this.savePluginsToStorage();
    this.notify();
  }

  public async reloadPlugin(pluginId: PluginId): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return;

    this.stopSandbox(pluginId);
    if (plugin.status === 'enabled' && !this.isSafeMode) {
      await this.startSandbox(plugin);
    }
    this.notify();
  }

  public updatePermissions(pluginId: PluginId, permissions: PluginPermission[]): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return;

    plugin.grantedPermissions = permissions;
    this.savePluginsToStorage();
    this.reloadPlugin(pluginId);
  }

  public updateSettings(pluginId: PluginId, settings: Record<string, any>): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return;

    plugin.settings = { ...plugin.settings, ...settings };
    this.savePluginsToStorage();
    this.notify();
  }

  /**
   * Dispatches command invocation to the target plugin sandbox
   */
  public async invokePluginCommand(fullCommandId: string, context?: any): Promise<any> {
    // Expected format: plugin:<pluginId>:<cmdId>
    if (!fullCommandId.startsWith('plugin:')) {
      throw new Error(`Invalid plugin command ID format: ${fullCommandId}`);
    }

    const parts = fullCommandId.split(':');
    if (parts.length < 3) {
      throw new Error(`Malformed plugin command ID: ${fullCommandId}`);
    }

    const pluginId = parts[1];
    const cmdId = parts.slice(2).join(':');

    const plugin = this.plugins.get(pluginId);
    if (!plugin || plugin.status !== 'enabled') {
      throw new Error(`Plugin "${pluginId}" is not enabled or not installed.`);
    }

    let sandbox = this.activeSandboxes.get(pluginId);
    if (!sandbox) {
      await this.startSandbox(plugin);
      sandbox = this.activeSandboxes.get(pluginId);
    }

    if (!sandbox) {
      throw new Error(`Could not initialize sandbox for plugin "${pluginId}".`);
    }

    return await sandbox.invokeCommand(cmdId, context);
  }

  /**
   * Returns list of all registered plugin commands for the Command Palette
   */
  public getRegisteredCommands(): Array<{
    id: string; // plugin:<pluginId>:<cmdId>
    title: string;
    description: string;
    pluginName: string;
    pluginId: string;
    icon?: string;
  }> {
    const results: Array<{
      id: string;
      title: string;
      description: string;
      pluginName: string;
      pluginId: string;
      icon?: string;
    }> = [];

    if (this.isSafeMode) return results;

    for (const plugin of this.plugins.values()) {
      if (plugin.status !== 'enabled') continue;
      if (plugin.manifest.contributions?.commands) {
        for (const cmd of plugin.manifest.contributions.commands) {
          results.push({
            id: `plugin:${plugin.manifest.id}:${cmd.id}`,
            title: cmd.title,
            description: cmd.description || `Provided by ${plugin.manifest.name}`,
            pluginName: plugin.manifest.name,
            pluginId: plugin.manifest.id,
            icon: cmd.icon || 'Puzzle',
          });
        }
      }
    }

    return results;
  }

  /**
   * Returns list of registered workspace views
   */
  public getRegisteredViews(): Array<{
    id: string;
    pluginId: string;
    title: string;
    icon?: string;
    supportsMobile?: boolean;
  }> {
    const results: Array<{
      id: string;
      pluginId: string;
      title: string;
      icon?: string;
      supportsMobile?: boolean;
    }> = [];

    if (this.isSafeMode) return results;

    for (const plugin of this.plugins.values()) {
      if (plugin.status !== 'enabled') continue;
      if (plugin.manifest.contributions?.views) {
        for (const view of plugin.manifest.contributions.views) {
          results.push({
            id: view.id,
            pluginId: plugin.manifest.id,
            title: view.title,
            icon: view.icon || 'Layout',
            supportsMobile: view.supportsMobile ?? plugin.manifest.supportsMobile ?? true,
          });
        }
      }
    }

    return results;
  }

  public notifyVaultEvent(type: string, resourceId: string): void {
    if (this.isSafeMode) return;
    const event = { type, resourceId, timestamp: Date.now() };

    for (const [pluginId, sandbox] of this.activeSandboxes) {
      const plugin = this.plugins.get(pluginId);
      if (plugin && plugin.grantedPermissions.includes('events.subscribe')) {
        sandbox.notifyVaultEvent(event);
      }
    }
  }

  public onVaultLocked(): void {
    // Terminate all sandboxes immediately
    for (const [id] of this.activeSandboxes) {
      this.stopSandbox(id);
    }
  }

  public onVaultUnlocked(): void {
    if (!this.isSafeMode) {
      this.startEnabledPlugins();
    }
  }

  public getPluginLogs(pluginId: PluginId): PluginLogEntry[] {
    return this.pluginLogs.get(pluginId) || [];
  }

  public clearLogs(pluginId: PluginId): void {
    this.pluginLogs.delete(pluginId);
    this.notify();
  }

  public getDiagnostics(pluginId: PluginId): PluginDiagnosticReport | null {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return null;

    return {
      pluginId: plugin.manifest.id,
      name: plugin.manifest.name,
      version: plugin.manifest.version,
      status: plugin.status,
      grantedPermissions: plugin.grantedPermissions,
      crashes: plugin.crashCount,
      storageBytes: plugin.storageUsageBytes,
      recentLogs: this.getPluginLogs(pluginId).slice(-20),
    };
  }

  private async startEnabledPlugins(): Promise<void> {
    for (const plugin of this.plugins.values()) {
      if (plugin.status === 'enabled' && plugin.workerCode) {
        await this.startSandbox(plugin);
      }
    }
  }

  private async startSandbox(plugin: InstalledPlugin): Promise<void> {
    if (!plugin.workerCode) return;
    this.stopSandbox(plugin.manifest.id);

    try {
      const sandbox = new PluginWorkerSandbox({
        pluginId: plugin.manifest.id,
        manifest: plugin.manifest,
        grantedPermissions: plugin.grantedPermissions,
        workerCode: plugin.workerCode,
        onRpcRequest: async (req) => {
          if (!this.dispatcher) throw new Error('Dispatcher not initialized');
          return await this.dispatcher.dispatch(
            plugin.manifest.id,
            plugin.grantedPermissions,
            req.method,
            req.params
          );
        },
        onLog: (level, message, details) => {
          this.log(plugin.manifest.id, level, message, details);
        },
        onCrash: (reason) => {
          this.handlePluginCrash(plugin.manifest.id, reason);
        },
      });

      await sandbox.start();
      this.activeSandboxes.set(plugin.manifest.id, sandbox);
    } catch (err: any) {
      this.handlePluginCrash(plugin.manifest.id, err.message || 'Failed to start worker');
    }
  }

  private stopSandbox(pluginId: PluginId): void {
    const active = this.activeSandboxes.get(pluginId);
    if (active) {
      active.terminate();
      this.activeSandboxes.delete(pluginId);
    }
  }

  private handlePluginCrash(pluginId: PluginId, reason: string): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return;

    plugin.crashCount = (plugin.crashCount || 0) + 1;
    plugin.lastCrashReason = reason;
    plugin.lastCrashTimestamp = Date.now();

    this.log(pluginId, 'error', `Plugin crashed: ${reason}`);
    this.stopSandbox(pluginId);

    if (plugin.crashCount >= MAX_CRASH_THRESHOLD) {
      plugin.status = 'crashed';
      this.log(pluginId, 'warn', `Plugin disabled automatically after ${MAX_CRASH_THRESHOLD} consecutive crashes.`);
    }

    this.savePluginsToStorage();
    this.notify();
  }

  private log(pluginId: PluginId, level: 'debug' | 'info' | 'warn' | 'error', message: string, details?: any): void {
    let logs = this.pluginLogs.get(pluginId);
    if (!logs) {
      logs = [];
      this.pluginLogs.set(pluginId, logs);
    }

    logs.push({
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      pluginId,
      timestamp: Date.now(),
      level,
      message,
      details,
    });

    if (logs.length > MAX_LOGS_PER_PLUGIN) {
      logs.splice(0, logs.length - MAX_LOGS_PER_PLUGIN);
    }
  }

  private loadInstalledPluginsFromStorage(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PLUGINS);
      if (raw) {
        const parsed: InstalledPlugin[] = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach((p) => {
            this.plugins.set(p.manifest.id, p);
          });
        }
      }
    } catch (e) {
      console.warn('Failed to load plugin registry from storage', e);
    }
  }

  private savePluginsToStorage(): void {
    try {
      const array = Array.from(this.plugins.values());
      localStorage.setItem(STORAGE_KEY_PLUGINS, JSON.stringify(array));
    } catch (e) {
      console.warn('Failed to save plugin registry to storage', e);
    }
  }
}

export const pluginRegistry = new PluginRegistry();
