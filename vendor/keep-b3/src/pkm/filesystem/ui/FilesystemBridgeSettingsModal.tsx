/**
 * Phase P45: Filesystem Bridge Settings & Control Modal
 */

import React, { useState, useEffect } from 'react';
import {
  Folder,
  FolderCheck,
  FolderSync,
  FolderX,
  HardDrive,
  RefreshCw,
  Settings,
  ShieldCheck,
  Download,
  Upload,
  X,
} from 'lucide-react';
import { filesystemBridgeService } from '../filesystemBridgeService';
import { getPlatformFilesystemCapabilities } from '../filesystemCapabilities';
import { filesystemDoctor } from '../filesystemDoctor';
import { FilesystemDoctorCheckResult, FilenamePolicy } from '../filesystemTypes';
import { Note, Folder as FolderType } from '../../../types';
import { exportVaultZipSnapshot, importFolderZipSnapshot } from '../filesystemFallbackExporter';

interface FilesystemBridgeSettingsModalProps {
  isOpen: boolean;
  notes: Note[];
  folders: FolderType[];
  onClose: () => void;
  onSaveNote: (note: Note) => void;
  onDeleteNote: (noteId: string) => void;
  onOpenReviewModal?: () => void;
  onOpenConflictModal?: () => void;
}

export const FilesystemBridgeSettingsModal: React.FC<FilesystemBridgeSettingsModalProps> = ({
  isOpen,
  notes,
  folders,
  onClose,
  onSaveNote,
  onDeleteNote,
  onOpenReviewModal,
  onOpenConflictModal,
}) => {
  const [config, setConfig] = useState(filesystemBridgeService.getConfig());
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [doctorResults, setDoctorResults] = useState<FilesystemDoctorCheckResult[]>([]);
  const [activeTab, setActiveTab] = useState<'status' | 'settings' | 'diagnostics' | 'logs'>('status');

  const caps = getPlatformFilesystemCapabilities();

  useEffect(() => {
    const unsub = filesystemBridgeService.subscribe(() => {
      setConfig(filesystemBridgeService.getConfig());
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (isOpen) {
      runDiagnostics();
    }
  }, [isOpen, config]);

  const runDiagnostics = async () => {
    const results = await filesystemDoctor.diagnose(
      config,
      filesystemBridgeService.getManifest(),
      filesystemBridgeService.getDiskInventory(),
      notes,
      folders
    );
    setDoctorResults(results);
  };

  if (!isOpen) return null;

  const handleConnectFolder = async () => {
    setIsConnecting(true);
    try {
      const res = await filesystemBridgeService.connectFolder(notes, folders);
      if (res.success) {
        await runDiagnostics();
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      const plan = await filesystemBridgeService.scanAndReconcile(
        notes,
        folders,
        onSaveNote,
        onDeleteNote
      );
      if (plan && plan.requiresSafetyReview && onOpenReviewModal) {
        onOpenReviewModal();
      }
      await runDiagnostics();
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (window.confirm('Disconnect external folder mirror? Local app notes and disk files will remain intact.')) {
      await filesystemBridgeService.disconnectFolder();
      await runDiagnostics();
    }
  };

  const handleToggleAutoSync = (enabled: boolean) => {
    filesystemBridgeService.updateSettings({ autoSync: enabled });
  };

  const handlePolicyChange = (policy: FilenamePolicy) => {
    filesystemBridgeService.updateSettings({ filenamePolicy: policy });
  };

  const handlePlaintextToggle = (enabled: boolean) => {
    filesystemBridgeService.updateSettings({ allowPlaintextEncryptedMirror: enabled });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        id="filesystem-bridge-settings-modal"
        className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
                Native Filesystem Vault Bridge
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Live bidirectional folder mirroring & external Obsidian / VS Code editing
              </p>
            </div>
          </div>
          <button
            id="close-fs-settings-modal-btn"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 border-b border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40 text-xs">
          <button
            onClick={() => setActiveTab('status')}
            className={`py-2.5 px-3 font-medium border-b-2 transition-colors ${
              activeTab === 'status'
                ? 'border-stone-900 dark:border-stone-100 text-stone-900 dark:text-stone-100'
                : 'border-transparent text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
            }`}
          >
            Bridge Status
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-2.5 px-3 font-medium border-b-2 transition-colors ${
              activeTab === 'settings'
                ? 'border-stone-900 dark:border-stone-100 text-stone-900 dark:text-stone-100'
                : 'border-transparent text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
            }`}
          >
            Mirror Settings
          </button>
          <button
            onClick={() => setActiveTab('diagnostics')}
            className={`py-2.5 px-3 font-medium border-b-2 transition-colors ${
              activeTab === 'diagnostics'
                ? 'border-stone-900 dark:border-stone-100 text-stone-900 dark:text-stone-100'
                : 'border-transparent text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
            }`}
          >
            Health Diagnostics ({doctorResults.length})
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`py-2.5 px-3 font-medium border-b-2 transition-colors ${
              activeTab === 'logs'
                ? 'border-stone-900 dark:border-stone-100 text-stone-900 dark:text-stone-100'
                : 'border-transparent text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
            }`}
          >
            Sync History
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'status' && (
            <div className="space-y-6">
              {/* Platform Capability Card */}
              <div className="p-4 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950/20 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                    Platform Capability: {caps.classification}
                  </div>
                  <p className="text-xs text-stone-600 dark:text-stone-400">
                    {caps.description}
                  </p>
                </div>
              </div>

              {/* Connection Status Card */}
              <div className="p-5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2.5 rounded-lg ${
                        config && config.status !== 'Disconnected'
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                          : 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400'
                      }`}
                    >
                      <Folder className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                        {config?.displayName || 'No Folder Connected'}
                      </h3>
                      <p className="text-xs text-stone-500 dark:text-stone-400">
                        Status: <span className="font-medium text-stone-800 dark:text-stone-200">{config?.status || 'Disconnected'}</span>
                      </p>
                    </div>
                  </div>

                  {config && config.status !== 'Disconnected' ? (
                    <div className="flex items-center gap-2">
                      <button
                        id="fs-manual-sync-btn"
                        disabled={isSyncing}
                        onClick={handleSyncNow}
                        className="px-3 py-1.5 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-xs font-medium rounded-lg hover:opacity-90 transition-opacity flex items-center gap-1.5"
                      >
                        <FolderSync className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                        Sync Now
                      </button>
                      <button
                        id="fs-disconnect-btn"
                        onClick={handleDisconnect}
                        className="px-3 py-1.5 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <FolderX className="w-3.5 h-3.5" />
                        Disconnect
                      </button>
                    </div>
                  ) : (
                    <button
                      id="fs-connect-folder-btn"
                      disabled={isConnecting || !caps.supportsDirectoryPicker}
                      onClick={handleConnectFolder}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-stone-300 dark:disabled:bg-stone-800 text-white text-xs font-medium rounded-lg shadow-sm transition-colors flex items-center gap-2"
                    >
                      <FolderCheck className="w-4 h-4" />
                      {isConnecting ? 'Connecting…' : 'Select Local Vault Folder'}
                    </button>
                  )}
                </div>

                {config && (
                  <div className="pt-3 border-t border-stone-100 dark:border-stone-800/80 text-xs text-stone-500 dark:text-stone-400 grid grid-cols-2 gap-2">
                    <div>
                      Last Synced:{' '}
                      <span className="font-medium text-stone-700 dark:text-stone-300">
                        {config.lastSyncTimestamp
                          ? new Date(config.lastSyncTimestamp).toLocaleTimeString()
                          : 'Never'}
                      </span>
                    </div>
                    <div>
                      Auto-Sync:{' '}
                      <span className="font-medium text-stone-700 dark:text-stone-300">
                        {config.settings.autoSync ? 'Active (every 10s)' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Fallback Snapshot Tools (Always available for Firefox / Safari / Portable Backups) */}
              <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/30 space-y-3">
                <div className="text-xs font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <Download className="w-4 h-4 text-stone-600 dark:text-stone-400" />
                  Manual Snapshot ZIP Export & Folder Re-Import
                </div>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Ideal for Firefox, Safari, iOS, or offline archiving. Exports a structured ZIP archive containing plain Markdown notes, folder directories, attachments, and manifest metadata.
                </p>
                <div className="flex items-center gap-3 pt-1">
                  <button
                    id="export-zip-snapshot-btn"
                    onClick={() => exportVaultZipSnapshot(notes, folders)}
                    className="px-3 py-1.5 bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Vault ZIP Snapshot
                  </button>
                  <label
                    htmlFor="import-zip-snapshot-input"
                    className="px-3 py-1.5 border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Import Folder / ZIP Archive
                    <input
                      id="import-zip-snapshot-input"
                      type="file"
                      accept=".zip"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          importFolderZipSnapshot(file, onSaveNote);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && config && (
            <div className="space-y-5 text-xs">
              {/* Auto Sync Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-stone-200 dark:border-stone-800">
                <div>
                  <div className="font-semibold text-stone-900 dark:text-stone-100">
                    Live Background Auto-Sync
                  </div>
                  <div className="text-stone-500 dark:text-stone-400">
                    Automatically scans and syncs external changes on tab focus and keystroke debounce.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.settings.autoSync}
                  onChange={(e) => handleToggleAutoSync(e.target.checked)}
                  className="rounded border-stone-300 text-stone-900 focus:ring-stone-500 h-4 w-4"
                />
              </div>

              {/* Filename Policy */}
              <div className="p-3 rounded-lg border border-stone-200 dark:border-stone-800 space-y-2">
                <div className="font-semibold text-stone-900 dark:text-stone-100">
                  Filename Formatting Policy
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="filenamePolicy"
                      checked={config.settings.filenamePolicy === 'follow_title'}
                      onChange={() => handlePolicyChange('follow_title')}
                      className="text-stone-900 focus:ring-stone-500"
                    />
                    <span>Follow Canonical Title (e.g. &quot;Projects/Q3 Report.md&quot;)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="filenamePolicy"
                      checked={config.settings.filenamePolicy === 'stable_id'}
                      onChange={() => handlePolicyChange('stable_id')}
                      className="text-stone-900 focus:ring-stone-500"
                    />
                    <span>Append Stable ID (e.g. &quot;Projects/Q3 Report_a1b2c3d4.md&quot;)</span>
                  </label>
                </div>
              </div>

              {/* Encrypted Vault Plaintext Mirroring */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-stone-200 dark:border-stone-800">
                <div>
                  <div className="font-semibold text-stone-900 dark:text-stone-100">
                    Allow Plaintext Mirroring for Encrypted Vaults
                  </div>
                  <div className="text-stone-500 dark:text-stone-400">
                    Allows decrypted Markdown files to be written directly to the external folder.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.settings.allowPlaintextEncryptedMirror}
                  onChange={(e) => handlePlaintextToggle(e.target.checked)}
                  className="rounded border-stone-300 text-stone-900 focus:ring-stone-500 h-4 w-4"
                />
              </div>
            </div>
          )}

          {activeTab === 'diagnostics' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
                  Filesystem Health Checks
                </span>
                <button
                  onClick={runDiagnostics}
                  className="text-xs text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 flex items-center gap-1 font-medium"
                >
                  <RefreshCw className="w-3 h-3" /> Re-run Diagnostics
                </button>
              </div>

              <div className="space-y-2">
                {doctorResults.map((res) => (
                  <div
                    key={res.id}
                    className={`p-3 rounded-lg border text-xs flex items-start justify-between gap-3 ${
                      res.status === 'pass'
                        ? 'border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200'
                        : res.status === 'warning'
                        ? 'border-amber-200 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200'
                        : 'border-rose-200 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/20 text-rose-900 dark:text-rose-200'
                    }`}
                  >
                    <div>
                      <div className="font-semibold flex items-center gap-1.5">
                        <span>{res.title}</span>
                      </div>
                      <div className="mt-0.5 text-stone-600 dark:text-stone-400">{res.details}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-2 text-xs">
              <div className="text-xs font-semibold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-2">
                Recent Synchronization Activity
              </div>
              {filesystemBridgeService.getSyncLogs().length === 0 ? (
                <div className="p-4 text-center text-stone-400 dark:text-stone-600">
                  No synchronization history recorded yet.
                </div>
              ) : (
                <div className="border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden divide-y divide-stone-200 dark:divide-stone-800">
                  {filesystemBridgeService.getSyncLogs().map((log) => (
                    <div key={log.id} className="p-3 flex items-center justify-between">
                      <div>
                        <div className="font-medium text-stone-800 dark:text-stone-200">
                          {log.appToDisk} to disk, {log.diskToApp} imported ({log.conflicts} conflicts)
                        </div>
                        <div className="text-[11px] text-stone-400">
                          {new Date(log.timestamp).toLocaleString()} &bull; {log.durationMs}ms
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/60">
          <button
            id="close-fs-settings-btn"
            onClick={onClose}
            className="px-4 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-xs font-medium rounded-lg shadow-sm hover:opacity-90 transition-opacity"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
