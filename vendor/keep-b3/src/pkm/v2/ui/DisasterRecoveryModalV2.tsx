/**
 * PKM V2.6 — Disaster Recovery, Backup & Storage Integrity Modal
 *
 * Provides a unified, high-integrity dashboard for backup generation management,
 * verified restore staging, partial salvage, corruption quarantine, and storage diagnostics.
 */

import React, { useState, useEffect } from 'react';
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
  FolderOpen,
  FileCheck,
  Layers,
  ArrowRight,
  Database,
  Info,
  X,
  AlertCircle,
  FileCode,
  Sparkles,
  Activity,
  FileText,
  Search,
} from 'lucide-react';
import {
  backupServiceV2,
  BackupGenerationV2,
} from '../disaster/backupServiceV2';
import {
  backupVerifierV2,
} from '../disaster/verifyBackupV2';
import {
  restoreEngineV2,
} from '../disaster/restoreEngineV2';
import {
  salvageEngineV2,
} from '../disaster/salvageEngineV2';
import {
  quarantineStoreV2,
} from '../disaster/quarantineStoreV2';
import {
  vaultDoctorV2,
} from '../disaster/vaultDoctorV2';
import {
  storageResilienceManagerV2,
} from '../disaster/storageResilienceV2';
import {
  selectiveRestoreEngineV2,
  SelectiveRestoreItem,
} from '../disaster/selectiveRestoreV2';
import {
  BackupVerificationResultV2,
  RestoreReportV2,
  SalvageReportV2,
  QuarantineRecordV2,
  VaultDoctorReportV2,
  StorageCategoryBreakdownV2,
} from '../disaster/backupTypesV2';
import { formatByteSize } from '../../media/mediaService';
import { V2_6_DISASTER_SCENARIOS, V2_6_DATA_CLASSIFICATION_MATRIX } from '../audit/v2_6BackupStorageAudit';
import { Note, Folder, SavedSearch, AppSettings } from '../../../types';

interface DisasterRecoveryModalV2Props {
  isOpen: boolean;
  onClose: () => void;
  notes?: Note[];
  folders?: Folder[];
  savedSearches?: SavedSearch[];
  settings?: AppSettings;
  onVaultReload?: () => Promise<void>;
}

type TabType = 'generations' | 'verify_restore' | 'doctor_quarantine' | 'storage' | 'disaster_guide';

export const DisasterRecoveryModalV2: React.FC<DisasterRecoveryModalV2Props> = ({
  isOpen,
  onClose,
  notes = [],
  folders = [],
  savedSearches = [],
  onVaultReload,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('generations');
  const [generations, setGenerations] = useState<BackupGenerationV2[]>([]);
  const [quarantineRecords, setQuarantineRecords] = useState<QuarantineRecordV2[]>([]);
  const [storageBreakdown, setStorageBreakdown] = useState<StorageCategoryBreakdownV2 | null>(null);

  // Backup In-Progress State
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [backupProgress, setBackupProgress] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Verification & Restore State
  const [uploadedRawArchive, setUploadedRawArchive] = useState<string>('');
  const [uploadedFilename, setUploadedFilename] = useState<string>('');
  const [verificationResult, setVerificationResult] = useState<BackupVerificationResultV2 | null>(null);
  const [restoreReport, setRestoreReport] = useState<RestoreReportV2 | null>(null);
  const [salvageReport, setSalvageReport] = useState<SalvageReportV2 | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreProgressMsg, setRestoreProgressMsg] = useState<string>('');

  // Selective Restore State
  const [selectiveItems, setSelectiveItems] = useState<SelectiveRestoreItem[]>([]);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());

  // Doctor Scan State
  const [doctorReport, setDoctorReport] = useState<VaultDoctorReportV2 | null>(null);
  const [isScanningDoctor, setIsScanningDoctor] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const unsubGen = backupServiceV2.subscribe(setGenerations);
    const unsubQuar = quarantineStoreV2.subscribe(setQuarantineRecords);
    const unsubRestore = restoreEngineV2.subscribeProgress((p) => {
      setRestoreProgressMsg(p.currentStepMessage);
    });

    storageResilienceManagerV2.getStorageBreakdown().then(setStorageBreakdown);

    return () => {
      unsubGen();
      unsubQuar();
      unsubRestore();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle Backup Creation
  const handleCreateVerifiedBackup = async () => {
    setIsCreatingBackup(true);
    setStatusMessage(null);
    try {
      const res = await backupServiceV2.createBackupArchive({
        onProgress: (p) => setBackupProgress(`${p.stage} (${p.processed}/${p.total})`),
      });

      // Verify immediately
      const verifyRes = await backupVerifierV2.verifyBackup(res.rawJson, 'restore_tested');
      if (verifyRes.verified) {
        backupServiceV2.markGenerationVerified(res.generation.id, 'restore_tested');
        backupServiceV2.downloadBackupFile(res.generation.filename, res.rawJson);
        setStatusMessage({
          type: 'success',
          text: `Verified Backup created and downloaded successfully (${formatByteSize(res.generation.sizeBytes)}). Marked as Last Known-Good.`,
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: `Backup created but failed verification: ${verifyRes.error}`,
        });
      }
    } catch (e: any) {
      setStatusMessage({
        type: 'error',
        text: `Backup failed: ${e?.message || 'Unknown error'}`,
      });
    } finally {
      setIsCreatingBackup(false);
      setBackupProgress('');
    }
  };

  // Handle File Upload for Verification / Restore
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFilename(file.name);
    setVerificationResult(null);
    setRestoreReport(null);
    setSalvageReport(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result as string;
      setUploadedRawArchive(text);

      // Run dry-run verification
      const verify = await backupVerifierV2.verifyBackup(text, 'restore_tested');
      setVerificationResult(verify);

      // Populate selective items
      const listed = selectiveRestoreEngineV2.listArchiveItems(text);
      setSelectiveItems(listed.items);
      setSelectedPaths(new Set(listed.items.map((i) => i.path)));
    };
    reader.readAsText(file);
  };

  // Handle Full Restore
  const handleExecuteRestore = async () => {
    if (!uploadedRawArchive) return;
    setIsRestoring(true);
    setStatusMessage(null);
    try {
      const report = await restoreEngineV2.executeRestore(uploadedRawArchive, {
        mode: 'replace_current',
        currentVaultState: { notes, folders, savedSearches },
      });
      setRestoreReport(report);
      if (report.success) {
        setStatusMessage({
          type: 'success',
          text: `Vault restored successfully! ${report.restoredResourceCount} resources restored.`,
        });
        if (onVaultReload) {
          await onVaultReload();
        }
      } else {
        setStatusMessage({
          type: 'error',
          text: `Restore failed: ${report.error}`,
        });
      }
    } catch (e: any) {
      setStatusMessage({
        type: 'error',
        text: `Restore error: ${e?.message}`,
      });
    } finally {
      setIsRestoring(false);
    }
  };

  // Handle Partial Salvage
  const handleExecuteSalvage = async () => {
    if (!uploadedRawArchive) return;
    try {
      const report = await salvageEngineV2.salvageDamagedArchive(uploadedRawArchive);
      setSalvageReport(report);
      setStatusMessage({
        type: 'info',
        text: `Salvage completed: ${report.recoveredCount} readable resources recovered, ${report.corruptCount} unreadable entries isolated.`,
      });
    } catch (e: any) {
      setStatusMessage({
        type: 'error',
        text: `Salvage error: ${e?.message}`,
      });
    }
  };

  // Handle Doctor Scan
  const handleRunDoctorScan = async (type: 'quick' | 'full') => {
    setIsScanningDoctor(true);
    try {
      const report =
        type === 'quick'
          ? await vaultDoctorV2.runQuickCheck()
          : await vaultDoctorV2.runFullIntegrityScan();
      setDoctorReport(report);
    } finally {
      setIsScanningDoctor(false);
    }
  };

  // Handle Clear Rebuildable Data
  const handleClearRebuildableData = async () => {
    try {
      const res = await storageResilienceManagerV2.clearRebuildableData();
      const updatedBreakdown = await storageResilienceManagerV2.getStorageBreakdown();
      setStorageBreakdown(updatedBreakdown);
      setStatusMessage({
        type: 'success',
        text: `Freed ${formatByteSize(res.clearedBytes)} of derived cache data. Canonical notes and attachments were untouched.`,
      });
    } catch (e: any) {
      setStatusMessage({
        type: 'error',
        text: `Failed to clear derived cache: ${e?.message}`,
      });
    }
  };

  return (
    <div
      id="modal-disaster-recovery-v2"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Disaster Recovery and Backup Center"
    >
      <div className="relative flex flex-col w-full max-w-5xl h-[85vh] bg-stone-900 border border-stone-800 rounded-xl shadow-2xl text-stone-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-950">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-950/80 border border-emerald-800/60 rounded-lg text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-stone-100 flex items-center gap-2">
                Disaster Recovery & Storage Integrity
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                  v2.6
                </span>
              </h2>
              <p className="text-xs text-stone-400">
                Verified atomic backups, staged recovery, corruption quarantine & local-first resilience
              </p>
            </div>
          </div>
          <button
            id="btn-close-disaster-recovery"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Alert / Status Banner */}
        {statusMessage && (
          <div
            className={`px-6 py-2.5 text-xs font-medium border-b flex items-center justify-between ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/70 border-emerald-800 text-emerald-200'
                : statusMessage.type === 'error'
                ? 'bg-rose-950/70 border-rose-800 text-rose-200'
                : 'bg-amber-950/70 border-amber-800 text-amber-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-stone-400 hover:text-stone-200 underline text-[11px]"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-6 border-b border-stone-800 bg-stone-900/60 overflow-x-auto text-xs font-medium">
          <button
            id="tab-btn-generations"
            onClick={() => setActiveTab('generations')}
            className={`flex items-center gap-2 py-3 px-3 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'generations'
                ? 'border-emerald-500 text-emerald-400 font-semibold'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Download className="w-4 h-4" />
            Backup Generations ({generations.length})
          </button>
          <button
            id="tab-btn-verify-restore"
            onClick={() => setActiveTab('verify_restore')}
            className={`flex items-center gap-2 py-3 px-3 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'verify_restore'
                ? 'border-emerald-500 text-emerald-400 font-semibold'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            Verify, Restore & Salvage
          </button>
          <button
            id="tab-btn-doctor-quarantine"
            onClick={() => setActiveTab('doctor_quarantine')}
            className={`flex items-center gap-2 py-3 px-3 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'doctor_quarantine'
                ? 'border-emerald-500 text-emerald-400 font-semibold'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            Vault Doctor & Quarantine
            {quarantineRecords.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-900 text-rose-300 text-[10px]">
                {quarantineRecords.length}
              </span>
            )}
          </button>
          <button
            id="tab-btn-storage"
            onClick={() => setActiveTab('storage')}
            className={`flex items-center gap-2 py-3 px-3 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'storage'
                ? 'border-emerald-500 text-emerald-400 font-semibold'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            Storage & Quota
          </button>
          <button
            id="tab-btn-disaster-guide"
            onClick={() => setActiveTab('disaster_guide')}
            className={`flex items-center gap-2 py-3 px-3 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'disaster_guide'
                ? 'border-emerald-500 text-emerald-400 font-semibold'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Info className="w-4 h-4" />
            Disaster Taxonomy & Guide
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: GENERATIONS */}
          {activeTab === 'generations' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-stone-950 border border-stone-800">
                <div>
                  <h3 className="text-sm font-semibold text-stone-100 flex items-center gap-2">
                    Create Verified Backup Snapshot
                  </h3>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Exports canonical resources, tasks, domains & attachments with individual SHA-256 digests and cryptographic completion markers.
                  </p>
                </div>
                <button
                  id="btn-create-verified-backup"
                  onClick={handleCreateVerifiedBackup}
                  disabled={isCreatingBackup}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow transition-colors disabled:opacity-50"
                >
                  {isCreatingBackup ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Archiving...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Create Verified Backup</span>
                    </>
                  )}
                </button>
              </div>

              {backupProgress && (
                <div className="p-3 bg-stone-950 border border-stone-800 rounded-lg text-xs text-stone-300 flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  <span>{backupProgress}</span>
                </div>
              )}

              {/* Generation List */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                  Tracked Backup Generations ({generations.length})
                </h4>

                {generations.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-stone-800 rounded-lg text-stone-500 text-xs">
                    No backup generations recorded yet on this device. Click &quot;Create Verified Backup&quot; to create one.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {generations.map((gen) => (
                      <div
                        key={gen.id}
                        className="p-3.5 rounded-lg bg-stone-950 border border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-medium text-stone-200">{gen.filename}</span>
                            {gen.isLastKnownGood && (
                              <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-semibold">
                                ★ Last Known-Good
                              </span>
                            )}
                            {gen.verified ? (
                              <span className="flex items-center gap-1 text-emerald-400 text-[11px]">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Verified ({gen.verificationLevel})
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-amber-400 text-[11px]">
                                <AlertTriangle className="w-3.5 h-3.5" /> Unverified
                              </span>
                            )}
                          </div>
                          <div className="text-stone-400 text-[11px] flex items-center gap-4">
                            <span>Created: {new Date(gen.createdAt).toLocaleString()}</span>
                            <span>Size: {formatByteSize(gen.sizeBytes)}</span>
                            <span>Resources: {gen.resourceCount}</span>
                            <span className="font-mono text-stone-500">Hash: {gen.checksum.slice(0, 8)}...</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={async () => {
                              backupServiceV2.markGenerationVerified(gen.id, 'restore_tested');
                              setStatusMessage({ type: 'success', text: `Marked generation ${gen.filename} as verified.` });
                            }}
                            className="px-2.5 py-1.5 bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 rounded text-xs transition-colors"
                          >
                            Mark Verified
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: VERIFY, RESTORE & SALVAGE */}
          {activeTab === 'verify_restore' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="p-4 rounded-lg bg-stone-950 border border-stone-800 space-y-3">
                <h3 className="text-sm font-semibold text-stone-100 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-emerald-400" />
                  Select Backup Archive for Staged Inspection
                </h3>
                <p className="text-xs text-stone-400">
                  Select a backup file (.json) to verify its cryptographic integrity, inspect staged items, or perform a clean restore.
                </p>

                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept=".json"
                    id="input-upload-backup-archive"
                    onChange={handleFileUpload}
                    className="block text-xs text-stone-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-stone-800 file:text-stone-200 hover:file:bg-stone-700 cursor-pointer"
                  />
                  {uploadedFilename && (
                    <span className="text-xs font-mono text-emerald-400">Loaded: {uploadedFilename}</span>
                  )}
                </div>
              </div>

              {/* Verification Result Card */}
              {verificationResult && (
                <div
                  className={`p-4 rounded-lg border text-xs space-y-3 ${
                    verificationResult.verified
                      ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
                      : 'bg-rose-950/40 border-rose-800/80 text-rose-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-semibold">
                      {verificationResult.verified ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Archive Verified Successfully (SHA-256 Checksums Match)</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-4 h-4 text-rose-400" />
                          <span>Verification Failed: Corrupt or Incomplete Archive</span>
                        </>
                      )}
                    </div>
                    <span className="text-stone-400 font-mono text-[11px]">
                      {verificationResult.totalFilesChecked} files checked
                    </span>
                  </div>

                  {verificationResult.error && (
                    <div className="p-2 bg-rose-950 border border-rose-800 rounded font-mono text-[11px] text-rose-300">
                      {verificationResult.error}
                    </div>
                  )}

                  {verificationResult.warnings.length > 0 && (
                    <div className="space-y-1">
                      {verificationResult.warnings.map((w, idx) => (
                        <div key={idx} className="text-amber-300 text-[11px]">
                          ⚠️ {w}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Actions for Verified vs Damaged Archive */}
                  <div className="flex flex-wrap gap-3 pt-2 border-t border-stone-800/60">
                    {verificationResult.verified ? (
                      <button
                        id="btn-execute-full-restore"
                        onClick={handleExecuteRestore}
                        disabled={isRestoring}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg shadow transition-colors disabled:opacity-50"
                      >
                        {isRestoring ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>{restoreProgressMsg || 'Restoring...'}</span>
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Execute Staged Restore (Automatic Pre-Restore Snapshot)</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        id="btn-execute-salvage"
                        onClick={handleExecuteSalvage}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg shadow transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Run Partial Salvage Engine on Damaged Archive</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Selective Item Inspection */}
              {selectiveItems.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                    Staged Resources in Archive ({selectiveItems.length})
                  </h4>
                  <div className="max-h-60 overflow-y-auto space-y-1.5 p-2 bg-stone-950 border border-stone-800 rounded-lg text-xs">
                    {selectiveItems.slice(0, 100).map((item) => (
                      <div
                        key={item.path}
                        className="flex items-center justify-between p-2 rounded bg-stone-900/60 hover:bg-stone-900 border border-stone-800/40"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="px-1.5 py-0.5 rounded bg-stone-800 text-stone-300 text-[10px] font-mono">
                            {item.type}
                          </span>
                          <span className="text-stone-200 truncate">{item.title}</span>
                        </div>
                        <span className="text-stone-500 text-[11px] font-mono">{formatByteSize(item.size)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Salvage Results */}
              {salvageReport && (
                <div className="p-4 rounded-lg bg-stone-950 border border-amber-800 text-xs space-y-3">
                  <h4 className="font-semibold text-amber-300 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Salvage Engine Report
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    <div className="p-2 bg-stone-900 rounded border border-stone-800">
                      <span className="text-stone-400 block">Recovered:</span>
                      <span className="text-emerald-400 font-bold text-sm">{salvageReport.recoveredCount}</span>
                    </div>
                    <div className="p-2 bg-stone-900 rounded border border-stone-800">
                      <span className="text-stone-400 block">With Warnings:</span>
                      <span className="text-amber-400 font-bold text-sm">{salvageReport.recoveredWithWarningsCount}</span>
                    </div>
                    <div className="p-2 bg-stone-900 rounded border border-stone-800">
                      <span className="text-stone-400 block">Corrupt / Broken:</span>
                      <span className="text-rose-400 font-bold text-sm">{salvageReport.corruptCount}</span>
                    </div>
                    <div className="p-2 bg-stone-900 rounded border border-stone-800">
                      <span className="text-stone-400 block">Total Scanned:</span>
                      <span className="text-stone-200 font-bold text-sm">{salvageReport.totalEntriesScanned}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DOCTOR & QUARANTINE */}
          {activeTab === 'doctor_quarantine' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-stone-950 border border-stone-800">
                <div>
                  <h3 className="text-sm font-semibold text-stone-100 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    Vault Doctor Invariant & Corruption Scanner
                  </h3>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Validates schema conformance, broken references, domain invariants, and isolates corrupted records into Quarantine.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRunDoctorScan('quick')}
                    disabled={isScanningDoctor}
                    className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                  >
                    Quick Check (&lt;100ms)
                  </button>
                  <button
                    onClick={() => handleRunDoctorScan('full')}
                    disabled={isScanningDoctor}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                  >
                    Full Deep Scan
                  </button>
                </div>
              </div>

              {/* Doctor Report */}
              {doctorReport && (
                <div className="p-4 rounded-lg bg-stone-950 border border-stone-800 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-stone-200">
                      Scan Completed in {doctorReport.durationMs}ms ({doctorReport.totalResourcesScanned} resources checked)
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded font-semibold text-[10px] ${
                        doctorReport.healthy
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}
                    >
                      {doctorReport.healthy ? 'Vault Healthy' : `${doctorReport.issues.length} Issues Found`}
                    </span>
                  </div>

                  {doctorReport.issues.length > 0 && (
                    <div className="space-y-2">
                      {doctorReport.issues.map((iss) => (
                        <div
                          key={iss.id}
                          className="p-3 rounded bg-stone-900 border border-stone-800 flex items-start justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <span className="font-medium text-amber-300">{iss.title}</span>
                            <p className="text-stone-400 text-[11px]">{iss.description}</p>
                          </div>
                          {iss.autoFixable && (
                            <button
                              onClick={() => {
                                vaultDoctorV2.applyRepair(iss);
                                handleRunDoctorScan(doctorReport.scanType);
                              }}
                              className="px-2.5 py-1 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 rounded text-[11px] whitespace-nowrap"
                            >
                              {iss.fixActionName || 'Auto Repair'}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Quarantine Store Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-400 flex items-center gap-2">
                    Quarantine Store ({quarantineRecords.length})
                  </h4>
                  {quarantineRecords.length > 0 && (
                    <button
                      onClick={() => quarantineStoreV2.clear()}
                      className="text-xs text-rose-400 hover:text-rose-300"
                    >
                      Clear Quarantine
                    </button>
                  )}
                </div>

                {quarantineRecords.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-stone-800 rounded-lg text-stone-500 text-xs">
                    Quarantine store is empty. No corrupted or unparseable resources detected.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {quarantineRecords.map((q) => (
                      <div
                        key={q.id}
                        className="p-3.5 rounded-lg bg-rose-950/30 border border-rose-800/60 text-xs space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-rose-300 font-mono">{q.resourceId} ({q.resourceType})</span>
                          <span className="text-stone-400 text-[11px]">{new Date(q.quarantinedAt).toLocaleString()}</span>
                        </div>
                        <p className="text-stone-300 text-[11px]">{q.reason}</p>

                        {q.suggestedRepair && (
                          <div className="p-2 bg-stone-900 border border-stone-800 rounded space-y-1">
                            <span className="text-emerald-400 font-semibold text-[11px] block">
                              Suggested Repair: {q.suggestedRepair.description}
                            </span>
                            <pre className="text-[10px] text-stone-400 overflow-x-auto max-h-20">
                              {q.suggestedRepair.repairedPayload}
                            </pre>
                          </div>
                        )}

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => {
                              const blob = new Blob([q.rawPayload], { type: 'text/plain' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `quarantine-${q.resourceId}.raw`;
                              a.click();
                            }}
                            className="px-2.5 py-1 bg-stone-900 border border-stone-700 text-stone-300 rounded text-[11px]"
                          >
                            Export Raw Content
                          </button>
                          <button
                            onClick={() => quarantineStoreV2.release(q.id)}
                            className="px-2.5 py-1 bg-rose-950 border border-rose-800 text-rose-300 rounded text-[11px]"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: STORAGE & QUOTA */}
          {activeTab === 'storage' && (
            <div className="space-y-6 animate-in fade-in">
              {storageBreakdown && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-stone-950 border border-stone-800">
                    <span className="text-xs text-stone-400 block">Total Estimated Vault Footprint</span>
                    <span className="text-xl font-bold text-stone-100 font-mono mt-1 block">
                      {formatByteSize(storageBreakdown.totalEstimatedBytes)}
                    </span>
                  </div>
                  <div className="p-4 rounded-lg bg-stone-950 border border-stone-800">
                    <span className="text-xs text-stone-400 block">Canonical User Content</span>
                    <span className="text-xl font-bold text-emerald-400 font-mono mt-1 block">
                      {formatByteSize(storageBreakdown.canonicalResourcesBytes + storageBreakdown.attachmentsBytes)}
                    </span>
                  </div>
                  <div className="p-4 rounded-lg bg-stone-950 border border-stone-800">
                    <span className="text-xs text-stone-400 block">Derived Indexes & Ephemeral Caches</span>
                    <span className="text-xl font-bold text-amber-400 font-mono mt-1 block">
                      {formatByteSize(storageBreakdown.derivedIndexesBytes + storageBreakdown.ephemeralCachesBytes)}
                    </span>
                  </div>
                </div>
              )}

              {/* Categorized Footprint Table */}
              {storageBreakdown && (
                <div className="p-4 rounded-lg bg-stone-950 border border-stone-800 space-y-3 text-xs">
                  <h4 className="font-semibold text-stone-200">Storage Category Breakdown</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between py-1 border-b border-stone-800/60 text-stone-300">
                      <span>Unified Resources (Notes, Tasks, Projects, Domains)</span>
                      <span className="font-mono text-stone-400">{formatByteSize(storageBreakdown.canonicalResourcesBytes)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-stone-800/60 text-stone-300">
                      <span>Attachments & Media (PDFs, Images, Audio)</span>
                      <span className="font-mono text-stone-400">{formatByteSize(storageBreakdown.attachmentsBytes)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-stone-800/60 text-stone-300">
                      <span>Historical Revisions & Recovery Points</span>
                      <span className="font-mono text-stone-400">{formatByteSize(storageBreakdown.revisionsAndRecoveryBytes)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-stone-800/60 text-stone-300">
                      <span>Derived BM25 Search & Graph Indexes (Rebuildable)</span>
                      <span className="font-mono text-amber-400">{formatByteSize(storageBreakdown.derivedIndexesBytes)}</span>
                    </div>
                    <div className="flex justify-between py-1 text-stone-300">
                      <span>Ephemeral Thumbnail & View Caches (Rebuildable)</span>
                      <span className="font-mono text-amber-400">{formatByteSize(storageBreakdown.ephemeralCachesBytes)}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-stone-800 flex items-center justify-between">
                    <div>
                      <h5 className="font-semibold text-stone-200">Clear Derived Rebuildable Data</h5>
                      <p className="text-stone-400 text-[11px]">
                        Safely wipes search inverted indexes and render caches without touching notes, tasks, or attachments.
                      </p>
                    </div>
                    <button
                      onClick={handleClearRebuildableData}
                      className="px-3 py-2 bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 rounded-lg text-xs font-semibold transition-colors"
                    >
                      Clear Rebuildable Data
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: DISASTER GUIDE */}
          {activeTab === 'disaster_guide' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                  Data Classification & Integrity Boundaries
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {V2_6_DATA_CLASSIFICATION_MATRIX.map((item, idx) => (
                    <div key={idx} className="p-3.5 rounded-lg bg-stone-950 border border-stone-800 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-stone-100">{item.categoryName}</span>
                        <span className="px-2 py-0.5 rounded bg-stone-900 border border-stone-700 text-[10px] text-stone-300 font-mono">
                          {item.classification}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-[11px] text-stone-400">
                        <span>Backup: {item.includedInBackup ? '✅ Yes' : '❌ Excluded'}</span>
                        <span>Sync: {item.includedInSync ? '✅ Yes' : '❌ Excluded'}</span>
                        <span>Rebuildable: {item.rebuildableOnDemand ? '⚡ Yes' : '🔒 Canonical'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                  Disaster Scenario Prevention & Recovery Matrix
                </h4>
                <div className="space-y-2">
                  {V2_6_DISASTER_SCENARIOS.map((scen) => (
                    <div key={scen.id} className="p-3.5 rounded-lg bg-stone-950 border border-stone-800 text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-emerald-400">{scen.scenarioName}</span>
                        <span className="text-stone-500 font-mono text-[10px]">{scen.id}</span>
                      </div>
                      <p className="text-stone-300 text-[11px]">
                        <strong className="text-stone-400">Prevention:</strong> {scen.preventionMechanism}
                      </p>
                      <p className="text-stone-300 text-[11px]">
                        <strong className="text-stone-400">Recovery:</strong> {scen.recoveryProcedure}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-stone-800 bg-stone-950 text-xs text-stone-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>PKM V2.6 Offline-First Storage Resilience Active</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
