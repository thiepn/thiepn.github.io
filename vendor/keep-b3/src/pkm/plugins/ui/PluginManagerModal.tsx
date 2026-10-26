/**
 * Phase P41: Plugin Manager Workspace Modal
 * Central administration UI for managing local plugins, permissions, Safe Mode,
 * and developer tools.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Puzzle,
  Shield,
  Upload,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Trash2,
  HardDrive,
  Cpu,
  Sliders,
  Terminal,
  ExternalLink,
  Lock,
  X,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { pluginRegistry } from '../registry/pluginRegistry';
import { InstalledPlugin, PluginManifest, PluginPermission } from '../types';
import { parsePluginPackageFile } from '../packageManager';
import { PluginPermissionModal } from './PluginPermissionModal';
import { PluginDeveloperConsole } from './PluginDeveloperConsole';
import { SamplePluginPackage } from '../samples/samplePlugins';

interface PluginManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPluginView?: (pluginId: string, viewId: string) => void;
}

export const PluginManagerModal: React.FC<PluginManagerModalProps> = ({
  isOpen,
  onClose,
  onOpenPluginView,
}) => {
  const [plugins, setPlugins] = useState<InstalledPlugin[]>([]);
  const [isSafeMode, setIsSafeMode] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'installed' | 'developer'>('installed');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [pendingInstallPackage, setPendingInstallPackage] = useState<{
    manifest: PluginManifest;
    workerCode?: string;
    uiHtml?: string;
    packageHash: string;
  } | null>(null);
  const [permissionEditPlugin, setPermissionEditPlugin] = useState<InstalledPlugin | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const update = () => {
      setPlugins(pluginRegistry.getInstalledPlugins());
      setIsSafeMode(pluginRegistry.getIsSafeMode());
    };

    update();
    const unsub = pluginRegistry.subscribe(update);
    return unsub;
  }, []);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setIsInstalling(true);

    try {
      const extracted = await parsePluginPackageFile(file);
      setPendingInstallPackage({
        manifest: extracted.manifest,
        workerCode: extracted.workerCode,
        uiHtml: extracted.uiHtml,
        packageHash: extracted.packageHash,
      });
    } catch (err: any) {
      setErrorMessage(`Failed to parse plugin package: ${err.message}`);
    } finally {
      setIsInstalling(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirmInstall = async (grantedPermissions: PluginPermission[]) => {
    if (!pendingInstallPackage) return;

    try {
      await pluginRegistry.installPlugin(
        pendingInstallPackage.manifest,
        grantedPermissions,
        pendingInstallPackage.workerCode,
        pendingInstallPackage.uiHtml,
        pendingInstallPackage.packageHash,
        false,
        'local_package'
      );
      setPendingInstallPackage(null);
    } catch (err: any) {
      setErrorMessage(`Installation error: ${err.message}`);
    }
  };

  const handleSampleInstall = (sample: SamplePluginPackage) => {
    setPendingInstallPackage({
      manifest: sample.manifest,
      workerCode: sample.workerCode,
      uiHtml: sample.uiHtml,
      packageHash: 'sample_builtin_package',
    });
  };

  const handleSaveEditedPermissions = (newPermissions: PluginPermission[]) => {
    if (!permissionEditPlugin) return;
    pluginRegistry.updatePermissions(permissionEditPlugin.manifest.id, newPermissions);
    setPermissionEditPlugin(null);
  };

  const filteredPlugins = plugins.filter((p) => {
    const matchesSearch =
      p.manifest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.manifest.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.manifest.description.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (filterStatus === 'enabled') return p.status === 'enabled';
    if (filterStatus === 'disabled') return p.status === 'disabled';
    return true;
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="plugin-manager-title"
    >
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl max-w-4xl w-full flex flex-col h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between gap-4 bg-zinc-900">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 rounded-lg">
              <Puzzle className="w-6 h-6" />
            </div>
            <div>
              <h2 id="plugin-manager-title" className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                Plugin Architecture & Extensions
                <span className="text-xs bg-indigo-500/20 text-indigo-300 font-mono px-2 py-0.5 rounded-full border border-indigo-500/30">
                  API v1
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Isolated Web Worker sandboxes • Capability-based permissions • Offline-first
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".zip,.json,application/zip,application/json"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isInstalling}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs"
            >
              {isInstalling ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              Install from File
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Safe Mode Banner */}
        {isSafeMode && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between text-xs text-amber-300">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Plugin Safe Mode Active:</strong> All third-party plugins are disabled to protect startup and vault integrity.
              </span>
            </div>
            <button
              onClick={() => pluginRegistry.setSafeMode(false)}
              className="px-2.5 py-1 bg-amber-500 text-black font-semibold rounded text-[11px] hover:bg-amber-400 transition-colors"
            >
              Exit Safe Mode
            </button>
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2.5 flex items-center justify-between text-xs text-red-300">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-200">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tabs Bar */}
        <div className="px-5 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between gap-4">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('installed')}
              className={`py-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'installed'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Puzzle className="w-4 h-4" />
              Installed Plugins ({plugins.length})
            </button>
            <button
              onClick={() => setActiveTab('developer')}
              className={`py-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'developer'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Terminal className="w-4 h-4" />
              Developer Tools & Security Test Suite
            </button>
          </div>

          {activeTab === 'installed' && (
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Filter plugins..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs rounded-lg pl-8 pr-3 py-1 focus:ring-1 focus:ring-indigo-500 w-44"
                />
              </div>

              <div className="flex items-center border border-zinc-700 rounded-lg overflow-hidden bg-zinc-800 text-xs">
                {(['all', 'enabled', 'disabled'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setFilterStatus(st)}
                    className={`px-2.5 py-1 capitalize transition-colors ${
                      filterStatus === st ? 'bg-indigo-600 text-white font-medium' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tab Content */}
        <div className="p-5 overflow-y-auto flex-1">
          {activeTab === 'installed' ? (
            <div>
              {plugins.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-zinc-800 rounded-xl">
                  <Puzzle className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                  <h3 className="text-zinc-200 font-medium text-sm">No Plugins Installed</h3>
                  <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1 mb-4">
                    Install custom extensions from local package files (.zip / .json) or load sample reference plugins from the Developer Tools tab.
                  </p>
                  <button
                    onClick={() => setActiveTab('developer')}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium inline-flex items-center gap-1.5"
                  >
                    Browse Reference Sample Packages
                  </button>
                </div>
              ) : filteredPlugins.length === 0 ? (
                <div className="text-center py-10 text-zinc-500 text-xs">No plugins match your filter.</div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {filteredPlugins.map((plugin) => {
                    const isEnabled = plugin.status === 'enabled';
                    const hasViews = (plugin.manifest.contributions?.views?.length || 0) > 0;

                    return (
                      <div
                        key={plugin.manifest.id}
                        className={`bg-zinc-800/40 border rounded-xl p-4 transition-all ${
                          isEnabled
                            ? 'border-zinc-700/80 hover:border-zinc-600'
                            : 'border-zinc-800/60 opacity-75'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-zinc-100 text-sm">{plugin.manifest.name}</h3>
                              <span className="text-xs text-zinc-400 font-mono">v{plugin.manifest.version}</span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider ${
                                  plugin.status === 'enabled'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : plugin.status === 'crashed'
                                    ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                    : 'bg-zinc-700/40 text-zinc-400 border border-zinc-700'
                                }`}
                              >
                                {plugin.status}
                              </span>
                              <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">
                                {plugin.manifest.category}
                              </span>
                            </div>

                            <p className="text-xs text-zinc-300 line-clamp-2">{plugin.manifest.description}</p>

                            <div className="flex items-center gap-4 text-[11px] text-zinc-500 pt-1 flex-wrap">
                              <span>ID: <code className="text-zinc-400 font-mono">{plugin.manifest.id}</code></span>
                              <span>Author: {plugin.manifest.author.name}</span>
                              <span className="flex items-center gap-1">
                                <HardDrive className="w-3 h-3" /> Storage: {(plugin.storageUsageBytes / 1024).toFixed(1)}KB / 5MB
                              </span>
                            </div>

                            {/* Granted capabilities pills */}
                            <div className="pt-2 flex flex-wrap gap-1">
                              {plugin.grantedPermissions.map((perm) => (
                                <span
                                  key={perm}
                                  className="text-[10px] bg-zinc-900/90 text-zinc-400 border border-zinc-700/70 px-1.5 py-0.5 rounded font-mono"
                                >
                                  {perm}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Plugin Action Controls */}
                          <div className="flex items-center gap-2 shrink-0">
                            {hasViews && isEnabled && onOpenPluginView && (
                              <button
                                onClick={() => {
                                  const viewId = plugin.manifest.contributions?.views?.[0]?.id || 'main';
                                  onOpenPluginView(plugin.manifest.id, viewId);
                                  onClose();
                                }}
                                className="px-2.5 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                              >
                                <ExternalLink className="w-3.5 h-3.5" /> Open View
                              </button>
                            )}

                            <button
                              onClick={() => setPermissionEditPlugin(plugin)}
                              title="Review / Edit Permissions"
                              className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50 rounded-lg transition-colors"
                            >
                              <Shield className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => pluginRegistry.reloadPlugin(plugin.manifest.id)}
                              title="Reload Plugin Sandbox"
                              className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50 rounded-lg transition-colors"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => pluginRegistry.uninstallPlugin(plugin.manifest.id, true)}
                              title="Uninstall Plugin"
                              className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>

                            {/* Enable/Disable switch */}
                            <button
                              onClick={() => {
                                if (isEnabled) {
                                  pluginRegistry.disablePlugin(plugin.manifest.id);
                                } else {
                                  pluginRegistry.enablePlugin(plugin.manifest.id);
                                }
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                isEnabled
                                  ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200'
                                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                              }`}
                            >
                              {isEnabled ? 'Disable' : 'Enable'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <PluginDeveloperConsole
              plugins={plugins}
              onOpenPermissionModal={handleSampleInstall}
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between text-xs text-zinc-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-400" /> Network Requests Blocked
            </span>
            <span className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" /> Watchdog Timeout Enforced
            </span>
          </div>
          <button
            onClick={() => pluginRegistry.setSafeMode(!isSafeMode)}
            className={`text-[11px] font-medium px-2 py-1 rounded transition-colors ${
              isSafeMode
                ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            {isSafeMode ? 'Disable Safe Mode' : 'Start with Plugins Disabled (Safe Mode)'}
          </button>
        </div>
      </div>

      {/* Permission Review Modal on Install */}
      {pendingInstallPackage && (
        <PluginPermissionModal
          manifest={pendingInstallPackage.manifest}
          requestedPermissions={pendingInstallPackage.manifest.permissions}
          onConfirm={handleConfirmInstall}
          onCancel={() => setPendingInstallPackage(null)}
        />
      )}

      {/* Permission Review Modal on Edit */}
      {permissionEditPlugin && (
        <PluginPermissionModal
          manifest={permissionEditPlugin.manifest}
          requestedPermissions={permissionEditPlugin.manifest.permissions}
          onConfirm={handleSaveEditedPermissions}
          onCancel={() => setPermissionEditPlugin(null)}
        />
      )}
    </div>
  );
};
