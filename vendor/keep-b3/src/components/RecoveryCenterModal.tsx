import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  HardDrive,
  History,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Trash2,
  Lock,
  Unlock,
  Pin,
  FolderOpen,
  FileCheck,
  Layers,
  ArrowRight,
  Database,
  Info,
  X,
  AlertCircle,
  FileCode,
  Folder,
} from 'lucide-react';
import { Note, Folder as FolderType, SavedSearch, AppSettings } from '../types';
import { CanvasBoard } from '../pkm/canvasTypes';
import {
  recoveryPointService,
  backupService,
  storageQuotaMonitor,
  recoveryJournal,
  noteRevisionService,
  tombstoneService,
  conflictCenterService,
  multiTabCoordinator,
  RecoveryPointSummary,
  ExternalBackupStatus,
  StorageQuotaEstimate,
  JournalOperationEntry,
  UnifiedConflictRecord,
  TabCoordinatorState,
  DATA_CLASSIFICATION_REGISTRY,
} from '../pkm/resilience';
import { vaultEncryptionService } from '../pkm/encryption';
import { formatByteSize } from '../pkm/media/mediaService';

interface RecoveryCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  folders: FolderType[];
  savedSearches: SavedSearch[];
  settings?: AppSettings;
  canvases?: CanvasBoard[];
  onRestoreVault: (data: {
    notes: Note[];
    folders: FolderType[];
    savedSearches?: SavedSearch[];
    canvases?: CanvasBoard[];
    settings?: AppSettings;
  }) => Promise<void>;
}

type TabType = 'overview' | 'recovery_points' | 'external_backups' | 'conflicts' | 'journal';

export const RecoveryCenterModal: React.FC<RecoveryCenterModalProps> = ({
  isOpen,
  onClose,
  notes,
  folders,
  savedSearches,
  settings,
  canvases = [],
  onRestoreVault,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Subscribed States
  const [quotaEstimate, setQuotaEstimate] = useState<StorageQuotaEstimate | null>(null);
  const [recoveryPoints, setRecoveryPoints] = useState<RecoveryPointSummary[]>([]);
  const [backupStatus, setBackupStatus] = useState<ExternalBackupStatus | null>(null);
  const [journalEntries, setJournalEntries] = useState<JournalOperationEntry[]>([]);
  const [conflicts, setConflicts] = useState<UnifiedConflictRecord[]>([]);
  const [tabState, setTabState] = useState<TabCoordinatorState>(multiTabCoordinator.getState());
  const [tombstoneCount, setTombstoneCount] = useState<number>(tombstoneService.getAllTombstones().length);

  // Local Action States
  const [newPointLabel, setNewPointLabel] = useState('');
  const [isCreatingPoint, setIsCreatingPoint] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);

  // Restore Preview State
  const [previewPointId, setPreviewPointId] = useState<string | null>(null);
  const [restoreDiff, setRestoreDiff] = useState<{
    addedNoteCount: number;
    modifiedNoteCount: number;
    deletedNoteCount: number;
    unchangedNoteCount: number;
  } | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // Backup Verify State
  const [verifiedBackupResult, setVerifiedBackupResult] = useState<{
    valid: boolean;
    noteCount: number;
    folderCount: number;
    canvasCount: number;
    error?: string;
  } | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const unsubQuota = storageQuotaMonitor.subscribe((est) => setQuotaEstimate(est));
    const unsubPoints = recoveryPointService.subscribe((pts) => setRecoveryPoints(pts));
    const unsubBackup = backupService.subscribe((st) => setBackupStatus(st));
    const unsubJournal = recoveryJournal.subscribe((j) => setJournalEntries(j));
    const unsubConflicts = conflictCenterService.subscribe(() => setConflicts(conflictCenterService.getConflicts()));
    const unsubTab = multiTabCoordinator.subscribeState((st) => setTabState(st));
    const unsubTombstones = tombstoneService.subscribe(() => setTombstoneCount(tombstoneService.getAllTombstones().length));

    setConflicts(conflictCenterService.getConflicts());
    storageQuotaMonitor.refreshEstimate({ notes, folders, canvases });

    return () => {
      unsubQuota();
      unsubPoints();
      unsubBackup();
      unsubJournal();
      unsubConflicts();
      unsubTab();
      unsubTombstones();
    };
  }, [isOpen, notes, folders, canvases]);

  // Flash message clear
  useEffect(() => {
    if (actionSuccessMessage || actionErrorMessage) {
      const t = setTimeout(() => {
        setActionSuccessMessage(null);
        setActionErrorMessage(null);
      }, 5000);
      return () => clearTimeout(t);
    }
  }, [actionSuccessMessage, actionErrorMessage]);

  if (!isOpen) return null;

  const isEncrypted = vaultEncryptionService.isEncryptionEnabled();

  // Handlers
  const handleCreateManualPoint = async () => {
    if (isCreatingPoint) return;
    setIsCreatingPoint(true);
    try {
      const label = newPointLabel.trim() || 'Manual Checkpoint';
      await recoveryPointService.createRecoveryPoint(
        'manual',
        label,
        { notes, folders, savedSearches, canvases, settings },
        true // Protected by default when manually requested
      );
      setNewPointLabel('');
      setActionSuccessMessage(`Recovery Point "${label}" created successfully.`);
    } catch (e: any) {
      setActionErrorMessage(e?.message || 'Failed to create recovery point');
    } finally {
      setIsCreatingPoint(false);
    }
  };

  const handlePreviewRestore = async (id: string) => {
    setPreviewPointId(id);
    const diff = await recoveryPointService.previewRestoreDiff(id, notes);
    setRestoreDiff(diff);
  };

  const handleExecuteRestore = async () => {
    if (!previewPointId || isRestoring) return;
    setIsRestoring(true);

    try {
      const point = await recoveryPointService.getRecoveryPoint(previewPointId);
      if (!point) throw new Error('Recovery point not found');

      // 1. Create safety snapshot of current vault first
      await recoveryPointService.createRecoveryPoint(
        'before_restore',
        `Pre-Restore Backup (${new Date().toLocaleTimeString()})`,
        { notes, folders, savedSearches, canvases, settings },
        false
      );

      // 2. Perform restore
      await onRestoreVault({
        notes: point.notes,
        folders: point.folders,
        savedSearches: point.savedSearches,
        canvases: point.canvases,
        settings: point.settings,
      });

      setActionSuccessMessage(`Successfully restored vault to "${point.label}".`);
      setPreviewPointId(null);
      setRestoreDiff(null);
    } catch (e: any) {
      setActionErrorMessage(e?.message || 'Failed restoring recovery point');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleManualDownloadBackup = async () => {
    try {
      const res = await backupService.triggerManualDownload({
        notes,
        folders,
        savedSearches,
        settings,
        canvases,
      });
      setActionSuccessMessage(`Full vault backup downloaded: ${res.filename}`);
    } catch (e: any) {
      setActionErrorMessage(e?.message || 'Download failed');
    }
  };

  const handleConnectDirectory = async () => {
    const res = await backupService.connectFileSystemDirectory();
    if (res.success) {
      setActionSuccessMessage(`Connected backup folder: "${res.dirName}"`);
    } else if (res.error) {
      setActionErrorMessage(res.error);
    }
  };

  const handleSyncToDirectory = async () => {
    const res = await backupService.writeToConnectedDirectory({
      notes,
      folders,
      savedSearches,
      settings,
      canvases,
    });
    if (res.success) {
      setActionSuccessMessage(`Wrote backup archive to connected folder: ${res.filename}`);
    } else if (res.error) {
      setActionErrorMessage(res.error);
    }
  };

  const handleClearDerivedData = async () => {
    try {
      const res = await storageQuotaMonitor.clearDerivedDataCaches();
      setActionSuccessMessage(`Purged ${res.clearedKeys.length} derived caches. Indices will rebuild in background.`);
    } catch (e: any) {
      setActionErrorMessage(e?.message || 'Failed clearing cache');
    }
  };

  const handleVerifyBackupFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const content = reader.result as string;
      const res = await backupService.verifyBackupArchive(content);
      setVerifiedBackupResult(res);
    };
    reader.readAsText(file);
  };

  const unfinishedOps = journalEntries.filter(
    (op) =>
      op.status === 'prepared' ||
      op.status === 'running' ||
      op.status === 'recovery-required'
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recovery-center-title"
    >
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-zinc-900 dark:text-zinc-100">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 id="recovery-center-title" className="text-base font-semibold tracking-tight">
                Data Resilience & Recovery Center
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Atomic transactions, recovery points, bounded revisions & independent backups
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notifications */}
        {actionSuccessMessage && (
          <div className="mx-5 mt-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{actionSuccessMessage}</span>
          </div>
        )}
        {actionErrorMessage && (
          <div className="mx-5 mt-3 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{actionErrorMessage}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 px-5 bg-zinc-50/20 dark:bg-zinc-800/10 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            Storage & Quota
          </button>
          <button
            onClick={() => setActiveTab('recovery_points')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'recovery_points'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <History className="w-4 h-4" />
            Recovery Points ({recoveryPoints.length})
          </button>
          <button
            onClick={() => setActiveTab('external_backups')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'external_backups'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <Download className="w-4 h-4" />
            External Backups
          </button>
          <button
            onClick={() => setActiveTab('conflicts')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'conflicts'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <AlertCircle className="w-4 h-4" />
            Conflict Center
            {conflicts.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 text-[10px] font-semibold">
                {conflicts.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('journal')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'journal'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <FileCode className="w-4 h-4" />
            Operation Journal
            {unfinishedOps.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-semibold">
                {unfinishedOps.length}
              </span>
            )}
          </button>
        </div>


        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* TAB 1: OVERVIEW & STORAGE QUOTA */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              {/* Quota Progress Card */}
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-zinc-500" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                      Browser Storage Quota
                    </span>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      quotaEstimate?.pressureLevel === 'critical'
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        : quotaEstimate?.pressureLevel === 'high'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : quotaEstimate?.pressureLevel === 'elevated'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}
                  >
                    {quotaEstimate?.pressureLevel?.toUpperCase() || 'NORMAL'} PRESSURE
                  </span>
                </div>

                <div className="w-full bg-zinc-200 dark:bg-zinc-700 h-2.5 rounded-full overflow-hidden mb-2">
                  <div
                    className={`h-full transition-all duration-300 ${
                      quotaEstimate?.pressureLevel === 'critical'
                        ? 'bg-rose-500'
                        : quotaEstimate?.pressureLevel === 'high'
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, quotaEstimate?.percentUsed || 1)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                  <span>
                    Used: <strong>{quotaEstimate?.humanUsage || '0 B'}</strong> of{' '}
                    {quotaEstimate?.humanQuota || 'Unlimited'}
                  </span>
                  <span>{quotaEstimate?.percentUsed || 0}% used</span>
                </div>
              </div>

              {/* Data Invariant & Classification Architecture */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Vault Data Architecture Classification
                  </h3>
                  <button
                    onClick={handleClearDerivedData}
                    className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Clear & Rebuild Derived Caches
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck className="w-4 h-4" />
                      Canonical User Work (Protected)
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      {notes.length} Notes, {folders.length} Folders, {canvases.length} Canvas Boards, attachments, and encryption salt. Protected by atomic write transactions and recovery points.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
                      <Layers className="w-4 h-4" />
                      Derived / Rebuildable State
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      Full-text search tokens, backlink graph, semantic embeddings, and fold states. Safely purgable to reclaim space whenever needed without data loss.
                    </p>
                  </div>
                </div>
              </div>

              {/* V1.2 Multi-Tab & Tombstone Telemetry */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-800/20">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Multi-Tab Coordination</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-mono ${tabState.isLeader ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'}`}>
                      {tabState.isLeader ? 'Leader Tab' : 'Follower Tab'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {tabState.knownTabsCount} active {tabState.knownTabsCount === 1 ? 'tab' : 'tabs'} connected via BroadcastChannel. Background jobs and migrations are single-leader bound.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-800/20">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Tombstones & Deletion Guards</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                      {tombstoneCount} tombstones
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Explicit tombstones prevent deleted notes and domain entities from being resurrected during sync or backup imports.
                  </p>
                </div>
              </div>

              {/* Persistence Permission Banner */}
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/40 dark:bg-zinc-800/20">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    Browser Eviction Protection
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {quotaEstimate?.hasPersistentStoragePermission
                      ? 'Storage is persisted and protected from automatic browser cache cleanup.'
                      : 'Request persistence permission to prevent browser from evicting local data under low disk space.'}
                  </p>
                </div>
                {!quotaEstimate?.hasPersistentStoragePermission && (
                  <button
                    onClick={() => storageQuotaMonitor.requestPersistentStorage()}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 transition-opacity whitespace-nowrap"
                  >
                    Request Protection
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: RECOVERY POINTS */}
          {activeTab === 'recovery_points' && (
            <div className="space-y-5">
              {/* Create Manual Checkpoint */}
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Checkpoint label (e.g. Before Major Refactor)..."
                  value={newPointLabel}
                  onChange={(e) => setNewPointLabel(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  onClick={handleCreateManualPoint}
                  disabled={isCreatingPoint}
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center justify-center gap-1.5 shrink-0"
                >
                  <History className="w-3.5 h-3.5" />
                  {isCreatingPoint ? 'Creating...' : 'Create Recovery Point'}
                </button>
              </div>

              {/* Restore Diff Preview Banner */}
              {previewPointId && restoreDiff && (
                <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-blue-900 dark:text-blue-300">
                      Restore Preview & Impact Summary
                    </span>
                    <button
                      onClick={() => setPreviewPointId(null)}
                      className="text-xs text-zinc-500 hover:text-zinc-700"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-blue-100 dark:border-blue-900/40">
                      <div className="text-zinc-500 text-[10px]">Added Notes</div>
                      <div className="text-sm font-semibold text-emerald-600">+{restoreDiff.addedNoteCount}</div>
                    </div>
                    <div className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-blue-100 dark:border-blue-900/40">
                      <div className="text-zinc-500 text-[10px]">Modified Notes</div>
                      <div className="text-sm font-semibold text-amber-600">~{restoreDiff.modifiedNoteCount}</div>
                    </div>
                    <div className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-blue-100 dark:border-blue-900/40">
                      <div className="text-zinc-500 text-[10px]">Deleted Notes</div>
                      <div className="text-sm font-semibold text-rose-600">-{restoreDiff.deletedNoteCount}</div>
                    </div>
                    <div className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-blue-100 dark:border-blue-900/40">
                      <div className="text-zinc-500 text-[10px]">Unchanged</div>
                      <div className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                        {restoreDiff.unchangedNoteCount}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      A pre-restore safety checkpoint will be automatically created first.
                    </span>
                    <button
                      onClick={handleExecuteRestore}
                      disabled={isRestoring}
                      className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                    >
                      {isRestoring ? 'Restoring...' : 'Confirm Safe Restore'}
                    </button>
                  </div>
                </div>
              )}

              {/* Snapshots List */}
              <div className="space-y-2">
                {recoveryPoints.length === 0 ? (
                  <div className="text-center py-10 text-xs text-zinc-500">
                    No recovery points created yet. Automatic checkpoints are created before destructive edits.
                  </div>
                ) : (
                  recoveryPoints.map((point) => (
                    <div
                      key={point.id}
                      className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between gap-3 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                            {point.label}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 uppercase font-mono">
                            {point.trigger}
                          </span>
                          {point.isProtected && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center gap-1 font-medium">
                              <Pin className="w-2.5 h-2.5" /> Pinned
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-3">
                          <span>{new Date(point.createdAt).toLocaleString()}</span>
                          <span>•</span>
                          <span>{point.noteCount} notes</span>
                          <span>•</span>
                          <span>{formatByteSize(point.approximateSizeBytes)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handlePreviewRestore(point.id)}
                          className="px-3 py-1 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 transition-colors"
                        >
                          Preview & Restore
                        </button>
                        <button
                          onClick={() => recoveryPointService.toggleProtected(point.id)}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            point.isProtected
                              ? 'border-amber-300 dark:border-amber-800 text-amber-600 bg-amber-50/50 dark:bg-amber-950/30'
                              : 'border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:text-zinc-600'
                          }`}
                          title={point.isProtected ? 'Unpin from auto-pruning' : 'Pin to protect from auto-pruning'}
                        >
                          <Pin className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => recoveryPointService.deleteRecoveryPoint(point.id)}
                          className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:text-rose-600 hover:border-rose-300 transition-colors"
                          title="Delete recovery point"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: EXTERNAL BACKUPS */}
          {activeTab === 'external_backups' && (
            <div className="space-y-5">
              {/* Backup Guarantee Banner */}
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  <Info className="w-4 h-4 text-emerald-600" />
                  Independent Backup Guarantee
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Same-origin IndexedDB snapshots protect against user edits, but do NOT survive browser cache clearing or disk formatting. True backups must be saved outside the browser to your local disk or remote Git repository.
                </p>
              </div>

              {/* Action Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Manual File Download */}
                <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <Download className="w-4 h-4 text-emerald-600" />
                      Standalone Vault Archive
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Exports complete canonical vault with deterministic JSON manifest and sha256 checksums.
                    </p>
                    {isEncrypted && (
                      <div className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-1">
                        <Lock className="w-3 h-3" /> Will be exported as an encrypted bundle.
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleManualDownloadBackup}
                    className="w-full py-2 px-3 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center justify-center gap-2"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Backup File
                  </button>
                </div>

                {/* File System Sync */}
                <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <FolderOpen className="w-4 h-4 text-blue-600" />
                      Local Backup Directory
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {backupStatus?.filesystemDirectoryHandleName
                        ? `Connected to folder: "${backupStatus.filesystemDirectoryHandleName}"`
                        : 'Connect a local directory to write direct vault backup snapshots.'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleConnectDirectory}
                      className="flex-1 py-2 px-3 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 transition-colors"
                    >
                      {backupStatus?.filesystemDirectoryHandleName ? 'Change Folder' : 'Connect Folder'}
                    </button>
                    {backupStatus?.filesystemDirectoryHandleName && (
                      <button
                        onClick={handleSyncToDirectory}
                        className="flex-1 py-2 px-3 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                      >
                        Sync Now
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Verify Backup Dropzone */}
              <div className="p-4 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50/30 dark:bg-zinc-800/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-indigo-600" />
                    Verify Backup Integrity (Clean-Slate Test)
                  </span>
                  <label className="px-3 py-1 text-xs font-medium rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 cursor-pointer">
                    Select Backup File
                    <input
                      type="file"
                      accept=".json,.vault"
                      onChange={handleVerifyBackupFile}
                      className="hidden"
                    />
                  </label>
                </div>

                {verifiedBackupResult && (
                  <div
                    className={`p-3 rounded-lg text-xs space-y-1 ${
                      verifiedBackupResult.valid
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                        : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                    }`}
                  >
                    <div className="font-semibold flex items-center gap-1.5">
                      {verifiedBackupResult.valid ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                      )}
                      {verifiedBackupResult.valid
                        ? 'Valid Backup Archive Verified'
                        : `Invalid Backup: ${verifiedBackupResult.error}`}
                    </div>
                    {verifiedBackupResult.valid && (
                      <p className="text-[11px] opacity-90">
                        Contains {verifiedBackupResult.noteCount} notes, {verifiedBackupResult.folderCount} folders, and {verifiedBackupResult.canvasCount} canvas boards. All manifests checksums match.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: CONFLICT CENTER */}
          {activeTab === 'conflicts' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    Unified Conflict Resolution Center
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Resolve divergent edits across notes, filesystem sync, and structured resources.
                  </p>
                </div>
                {conflicts.length > 0 && (
                  <button
                    onClick={() => {
                      conflictCenterService.clearAllResolved();
                      setConflicts(conflictCenterService.getConflicts());
                    }}
                    className="px-2.5 py-1 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                  >
                    Clear Resolved
                  </button>
                )}
              </div>

              {conflicts.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                  <div className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                    No Unresolved Conflicts
                  </div>
                  <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                    All local edits, synced files, and domain records are cleanly synchronized.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {conflicts.map((conflict) => (
                    <div
                      key={conflict.id}
                      className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                              {conflict.title}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-md font-mono bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                              {conflict.resourceType}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                            {conflict.conflictSummary} • Detected {new Date(conflict.detectedAt).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50">
                          <div className="font-medium text-zinc-700 dark:text-zinc-300 mb-1">Local Version</div>
                          <div className="text-[11px] text-zinc-500 font-mono line-clamp-3">
                            {typeof conflict.localVersion === 'string'
                              ? conflict.localVersion
                              : JSON.stringify(conflict.localVersion)}
                          </div>
                        </div>
                        <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50">
                          <div className="font-medium text-zinc-700 dark:text-zinc-300 mb-1">Remote / Sync Version</div>
                          <div className="text-[11px] text-zinc-500 font-mono line-clamp-3">
                            {typeof conflict.remoteVersion === 'string'
                              ? conflict.remoteVersion
                              : JSON.stringify(conflict.remoteVersion)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                        <button
                          onClick={() => {
                            conflictCenterService.resolveConflict(conflict.id, 'keep_local');
                            setConflicts(conflictCenterService.getConflicts());
                            setActionSuccessMessage(`Resolved conflict "${conflict.title}" using Local version.`);
                          }}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200"
                        >
                          Keep Local
                        </button>
                        <button
                          onClick={() => {
                            conflictCenterService.resolveConflict(conflict.id, 'keep_remote');
                            setConflicts(conflictCenterService.getConflicts());
                            setActionSuccessMessage(`Resolved conflict "${conflict.title}" using Remote version.`);
                          }}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200"
                        >
                          Keep Remote
                        </button>
                        <button
                          onClick={() => {
                            conflictCenterService.resolveConflict(conflict.id, 'keep_both');
                            setConflicts(conflictCenterService.getConflicts());
                            setActionSuccessMessage(`Duplicated and kept both versions for "${conflict.title}".`);
                          }}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                        >
                          Keep Both
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: OPERATION JOURNAL */}
          {activeTab === 'journal' && (
            <div className="space-y-4">
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                Persistent audit trail of long-running or multi-entity mutations. Unfinished operations can be resumed or cleared safely.
              </div>

              {journalEntries.length === 0 ? (
                <div className="text-center py-10 text-xs text-zinc-500">
                  Operation journal is clean. No active or pending multi-step transactions.
                </div>
              ) : (
                <div className="space-y-2">
                  {journalEntries.map((op) => (
                    <div
                      key={op.id}
                      className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                            {op.title}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-md font-mono ${
                              op.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : op.status === 'recovery-required'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300'
                            }`}
                          >
                            {op.status}
                          </span>
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">
                          {new Date(op.startedAt).toLocaleString()} • {op.type} • {op.processedRecords}/
                          {op.totalRecords} records
                        </div>
                        {op.errorMessage && (
                          <div className="text-xs text-rose-600 dark:text-rose-400">
                            Error: {op.errorMessage}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => recoveryJournal.pruneOperation(op.id)}
                        className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:text-zinc-600"
                        title="Dismiss record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/30">
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Transaction Safety Active</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 transition-opacity"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
