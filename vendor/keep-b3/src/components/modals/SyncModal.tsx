import React, { useState, useEffect } from 'react';
import {
  FolderSync,
  Download,
  Upload,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  FileArchive,
  RefreshCw,
  FolderOpen,
  X,
  GitBranch,
  GitCommit,
  History,
  RotateCcw,
  ShieldCheck,
  Globe,
  Lock,
  Key,
  Layers,
  ArrowDownUp,
  AlertTriangle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  ShieldAlert,
} from 'lucide-react';
import { Note, Folder, SavedSearch, AppSettings } from '../../types';
import { storageService } from '../../services/storage';
import { canvasStorageService } from '../../pkm/canvasStorage';
import { pdfStorageService } from '../../pkm/pdfStorage';
import {
  PortableVaultData,
  GitCommitInfo,
  GitStatusSummary,
  FileSystemCapability,
} from '../../pkm/portableVaultTypes';
import {
  GitProvider,
  RemoteRepoConfig,
  SyncState,
  FileConflict,
  RemoteCommitRef,
} from '../../pkm/remoteGitTypes';
import {
  pickLocalVaultDirectory,
  exportVaultToDirectoryHandle,
  importVaultFromDirectoryHandle,
  downloadPortableVaultZip,
  importVaultFromZipBlob,
  importVaultFromFileList,
  getFileSystemCapability,
} from '../../pkm/filesystemAdapter';
import { localGitService } from '../../pkm/localGitService';
import { remoteSyncManager } from '../../pkm/remoteSyncManager';
import { hardenedTokenStorage } from '../../pkm/security/tokenStorage';
import { vaultEncryptionService } from '../../pkm/encryption/vaultEncryptionService';
import { BROWSER_COMPATIBILITY_MATRIX, PROVIDER_CAPABILITIES } from '../../pkm/compatibilityMatrix';
import { ConflictResolverModal } from '../../pkm/ConflictResolverModal';
import { Radio } from 'lucide-react';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  folders: Folder[];
  savedSearches?: SavedSearch[];
  settings?: AppSettings;
  onNotesUpdated: (updatedNotes: Note[]) => void;
  onFoldersUpdated?: (updatedFolders: Folder[]) => void;
  onSavedSearchesUpdated?: (updatedSearches: SavedSearch[]) => void;
  onSettingsUpdated?: (updatedSettings: AppSettings) => void;
  onOpenDeviceSync?: () => void;
}

export const SyncModal: React.FC<SyncModalProps> = ({
  isOpen,
  onClose,
  notes,
  folders,
  savedSearches = [],
  settings,
  onNotesUpdated,
  onFoldersUpdated,
  onSavedSearchesUpdated,
  onSettingsUpdated,
  onOpenDeviceSync,
}) => {
  const [activeTab, setActiveTab] = useState<'filesystem' | 'git' | 'remote' | 'archives'>('filesystem');

  // Filesystem State
  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [folderName, setFolderName] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState<string>('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);
  const [capability, setCapability] = useState<FileSystemCapability>(getFileSystemCapability());

  // Git State (Local)
  const [gitStatus, setGitStatus] = useState<GitStatusSummary | null>(null);
  const [gitLog, setGitLog] = useState<GitCommitInfo[]>([]);
  const [commitMessage, setCommitMessage] = useState('');
  const [authorName, setAuthorName] = useState('Vault Author');
  const [authorEmail, setAuthorEmail] = useState('user@vault.local');
  const [isGitLoading, setIsGitLoading] = useState(false);
  const [selectedCommitToRestore, setSelectedCommitToRestore] = useState<GitCommitInfo | null>(null);

  // Remote Git Sync State
  const [remoteProvider, setRemoteProvider] = useState<GitProvider>('github');
  const [remoteOwner, setRemoteOwner] = useState('');
  const [remoteRepo, setRemoteRepo] = useState('');
  const [remoteBranch, setRemoteBranch] = useState('main');
  const [remoteBaseUrl, setRemoteBaseUrl] = useState('');
  const [corsProxyUrl, setCorsProxyUrl] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [saveEncryptedWithVault, setSaveEncryptedWithVault] = useState(false);
  const [remoteSyncState, setRemoteSyncState] = useState<SyncState>('idle');
  const [remoteCommitLog, setRemoteCommitLog] = useState<RemoteCommitRef[]>([]);
  const [remoteCommitMessage, setRemoteCommitMessage] = useState('');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isCheckingRemote, setIsCheckingRemote] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [activeConflicts, setActiveConflicts] = useState<FileConflict[]>([]);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [showMatrix, setShowMatrix] = useState(false);

  // Keyboard close and sync listener setup
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      setCapability(getFileSystemCapability());
      loadGitOverview();

      // Load saved remote config
      const savedConfig = remoteSyncManager.getConfig();
      if (savedConfig) {
        setRemoteProvider(savedConfig.provider || 'github');
        setRemoteOwner(savedConfig.owner || '');
        setRemoteRepo(savedConfig.repo || '');
        setRemoteBranch(savedConfig.branch || 'main');
        setRemoteBaseUrl(savedConfig.baseUrl || '');
        setCorsProxyUrl(savedConfig.corsProxyUrl || '');
        if (savedConfig.authorName) setAuthorName(savedConfig.authorName);
        if (savedConfig.authorEmail) setAuthorEmail(savedConfig.authorEmail);
      }
      const existingToken = remoteSyncManager.getSessionToken();
      if (existingToken) setTokenInput(existingToken);

      setRemoteSyncState(remoteSyncManager.getState());
      setActiveConflicts(remoteSyncManager.getActiveConflicts());
    }

    const unsubscribe = remoteSyncManager.addStatusListener((state, result) => {
      setRemoteSyncState(state);
      if (result?.conflicts && result.conflicts.length > 0) {
        setActiveConflicts(result.conflicts);
      }
    });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      unsubscribe();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Helper to gather complete vault data (notes, folders, searches, canvases, pdfs)
  const gatherCompleteVaultData = async (): Promise<PortableVaultData> => {
    const canvases = await canvasStorageService.getAllBoards();
    const pdfMetas = await pdfStorageService.getAllPDFAttachments();
    const pdfAttachments = [];

    for (const meta of pdfMetas) {
      const full = await pdfStorageService.getPDFAttachment(meta.id);
      if (full) {
        pdfAttachments.push({
          meta: full.attachment,
          blobData: full.blob,
        });
      }
    }

    return {
      notes,
      folders,
      savedSearches,
      settings,
      canvases,
      pdfAttachments,
    };
  };

  // Helper to apply imported vault data across DB and state
  const applyImportedVaultData = async (imported: PortableVaultData) => {
    // 1. Update Notes
    await storageService.saveAllNotes(imported.notes);
    onNotesUpdated(imported.notes);

    // 2. Update Folders
    if (imported.folders && imported.folders.length > 0) {
      for (const f of imported.folders) {
        await storageService.saveFolder(f);
      }
      if (onFoldersUpdated) onFoldersUpdated(imported.folders);
    }

    // 3. Update Saved Searches
    if (imported.savedSearches && imported.savedSearches.length > 0) {
      await storageService.saveAllSavedSearches(imported.savedSearches);
      if (onSavedSearchesUpdated) onSavedSearchesUpdated(imported.savedSearches);
    }

    // 4. Update Settings
    if (imported.settings && onSettingsUpdated) {
      await storageService.saveSettings(imported.settings);
      onSettingsUpdated(imported.settings);
    }

    // 5. Restore Canvases
    if (imported.canvases && imported.canvases.length > 0) {
      for (const board of imported.canvases) {
        await canvasStorageService.saveBoardImmediate(board);
      }
    }

    // 6. Restore PDFs
    if (imported.pdfAttachments && imported.pdfAttachments.length > 0) {
      for (const item of imported.pdfAttachments) {
        const blob = item.blobData instanceof Blob ? item.blobData : new Blob([item.blobData || new Uint8Array()]);
        await pdfStorageService.savePDFAttachment(item.meta, blob);
      }
    }
  };

  // --- Filesystem Operations ---

  const handleConnectFolder = async () => {
    setActionSuccessMsg(null);
    setActionErrorMsg(null);
    try {
      const handle = await pickLocalVaultDirectory();
      if (handle) {
        setDirHandle(handle);
        setFolderName(handle.name);
        setActionSuccessMsg(`Connected to local directory: "${handle.name}"`);
      }
    } catch (err: any) {
      setActionErrorMsg(err.message || 'Could not access local folder');
    }
  };

  const handleExportToFolder = async () => {
    if (!dirHandle) return;
    setIsProcessing(true);
    setProgressMsg('Serializing vault into portable filesystem layout...');
    setActionSuccessMsg(null);
    setActionErrorMsg(null);

    try {
      const vaultData = await gatherCompleteVaultData();
      const res = await exportVaultToDirectoryHandle(dirHandle, vaultData, (curr, total, file) => {
        setProgressMsg(`Writing file ${curr}/${total}: ${file}`);
      });

      if (res.errors.length > 0) {
        setActionErrorMsg(`Export completed with ${res.errors.length} errors: ${res.errors[0]}`);
      } else {
        setActionSuccessMsg(`Successfully exported ${res.writtenCount} files to "${folderName}"!`);
      }
    } catch (err: any) {
      setActionErrorMsg(err.message || 'Failed exporting vault to folder');
    } finally {
      setIsProcessing(false);
      setProgressMsg('');
    }
  };

  const handleImportFromFolder = async () => {
    if (!dirHandle) return;
    setIsProcessing(true);
    setProgressMsg('Scanning and importing portable vault directory...');
    setActionSuccessMsg(null);
    setActionErrorMsg(null);

    try {
      const imported = await importVaultFromDirectoryHandle(dirHandle, (count, file) => {
        setProgressMsg(`Reading file ${count}: ${file}`);
      });

      await applyImportedVaultData(imported);
      setActionSuccessMsg(
        `Successfully imported ${imported.notes.length} notes, ${imported.folders.length} folders, and ${imported.canvases?.length || 0} canvases!`
      );
    } catch (err: any) {
      setActionErrorMsg(err.message || 'Failed importing from directory');
    } finally {
      setIsProcessing(false);
      setProgressMsg('');
    }
  };

  const handleUniversalFolderInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsProcessing(true);
    setProgressMsg(`Importing ${files.length} files from directory selection...`);
    setActionSuccessMsg(null);
    setActionErrorMsg(null);

    try {
      const imported = await importVaultFromFileList(files);
      await applyImportedVaultData(imported);
      setActionSuccessMsg(`Imported ${imported.notes.length} notes and ${imported.folders.length} folders successfully!`);
    } catch (err: any) {
      setActionErrorMsg(err.message || 'Failed importing folder');
    } finally {
      setIsProcessing(false);
      setProgressMsg('');
      e.target.value = '';
    }
  };

  // --- Archive Backups (ZIP / JSON) ---

  const handleDownloadVaultZip = async () => {
    setIsProcessing(true);
    setProgressMsg('Generating compressed Portable Vault ZIP archive...');
    setActionSuccessMsg(null);
    setActionErrorMsg(null);

    try {
      const vaultData = await gatherCompleteVaultData();
      await downloadPortableVaultZip(vaultData);
      setActionSuccessMsg('Portable Vault ZIP downloaded successfully!');
    } catch (err: any) {
      setActionErrorMsg(err.message || 'Failed downloading vault ZIP');
    } finally {
      setIsProcessing(false);
      setProgressMsg('');
    }
  };

  const handleImportVaultZip = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    setProgressMsg('Extracting and verifying Portable Vault ZIP archive...');
    setActionSuccessMsg(null);
    setActionErrorMsg(null);

    try {
      const imported = await importVaultFromZipBlob(file, (curr, total) => {
        setProgressMsg(`Extracting file ${curr}/${total}...`);
      });
      await applyImportedVaultData(imported);
      setActionSuccessMsg(`Restored ${imported.notes.length} notes, ${imported.folders.length} folders, and attachments from ZIP archive!`);
    } catch (err: any) {
      setActionErrorMsg(err.message || 'Failed extracting ZIP archive');
    } finally {
      setIsProcessing(false);
      setProgressMsg('');
      e.target.value = '';
    }
  };

  const handleExportJson = async () => {
    try {
      const jsonStr = await storageService.exportFullBackup();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `KeepNotes_FullBackup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setActionErrorMsg(err.message || 'Failed exporting JSON');
    }
  };

  const handleRestoreJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      const text = await files[0].text();
      const restored = await storageService.restoreFullBackup(text);
      onNotesUpdated(restored.notes);
      if (onFoldersUpdated) onFoldersUpdated(restored.folders);
      setActionSuccessMsg(`Restored ${restored.notes.length} notes and ${restored.folders.length} folders successfully!`);
    } catch (err: any) {
      setActionErrorMsg(`Failed to restore JSON backup: ${err.message}`);
    } finally {
      e.target.value = '';
    }
  };

  // --- Local Git Versioning ---

  const loadGitOverview = async () => {
    setIsGitLoading(true);
    try {
      const isInit = await localGitService.isRepoInitialized();
      if (!isInit) {
        await localGitService.initRepository();
      }

      // Sync working tree with latest memory vault so status is accurate
      const vaultData = await gatherCompleteVaultData();
      await localGitService.syncVaultToWorkingTree(vaultData);

      const status = await localGitService.getStatus();
      setGitStatus(status);

      const log = await localGitService.getLog({ depth: 25 });
      setGitLog(log);
    } catch (err: any) {
      console.warn('Local Git load failed:', err);
    } finally {
      setIsGitLoading(false);
    }
  };

  const handleCreateGitCommit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commitMessage.trim()) return;

    setIsGitLoading(true);
    setActionSuccessMsg(null);
    setActionErrorMsg(null);

    try {
      const vaultData = await gatherCompleteVaultData();
      await localGitService.syncVaultToWorkingTree(vaultData);

      const commit = await localGitService.createCommit({
        message: commitMessage.trim(),
        author: { name: authorName.trim() || 'Vault Author', email: authorEmail.trim() || 'user@vault.local' },
      });

      setCommitMessage('');
      setActionSuccessMsg(`Created local Git commit [${commit.shortOid}]: "${commit.message}"`);
      await loadGitOverview();
    } catch (err: any) {
      setActionErrorMsg(err.message || 'Failed creating Git commit');
    } finally {
      setIsGitLoading(false);
    }
  };

  const handleConfirmRestoreCommit = async () => {
    if (!selectedCommitToRestore) return;
    setIsGitLoading(true);
    setActionSuccessMsg(null);
    setActionErrorMsg(null);

    try {
      const restoredVault = await localGitService.restoreVaultFromCommit(selectedCommitToRestore.oid);
      await applyImportedVaultData(restoredVault);
      setActionSuccessMsg(`Vault restored to snapshot [${selectedCommitToRestore.shortOid}] ("${selectedCommitToRestore.message}")!`);
      setSelectedCommitToRestore(null);
      await loadGitOverview();
    } catch (err: any) {
      setActionErrorMsg(err.message || 'Failed restoring Git commit snapshot');
    } finally {
      setIsGitLoading(false);
    }
  };

  // --- Remote Git Sync Operations ---

  const handleSaveRemoteConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    const config: RemoteRepoConfig = {
      provider: remoteProvider,
      owner: remoteOwner.trim(),
      repo: remoteRepo.trim(),
      branch: remoteBranch.trim() || 'main',
      baseUrl: remoteBaseUrl.trim() || undefined,
      corsProxyUrl: corsProxyUrl.trim() || undefined,
      authorName: authorName.trim() || undefined,
      authorEmail: authorEmail.trim() || undefined,
      credentialStorageMode: saveEncryptedWithVault ? 'encrypted_vault' : 'session_memory',
    };
    remoteSyncManager.saveConfig(config);

    if (tokenInput.trim()) {
      if (saveEncryptedWithVault && vaultEncryptionService.isEncryptionEnabled() && !vaultEncryptionService.isVaultLocked()) {
        const key = vaultEncryptionService.getActiveKey();
        if (key) {
          await remoteSyncManager.saveEncryptedTokenWithVaultKey(tokenInput.trim(), key);
          setActionSuccessMsg(`Saved remote configuration & encrypted token with active Vault Key.`);
          return;
        }
      }
      remoteSyncManager.setSessionToken(tokenInput.trim());
    }
    setActionSuccessMsg(`Saved remote repository settings for ${remoteProvider} (${config.owner}/${config.repo})`);
  };

  const handleCheckRemoteStatus = async () => {
    setIsCheckingRemote(true);
    setActionSuccessMsg(null);
    setActionErrorMsg(null);

    if (tokenInput.trim()) {
      remoteSyncManager.setSessionToken(tokenInput.trim());
    }

    try {
      const vaultData = await gatherCompleteVaultData();
      const status = await remoteSyncManager.checkSyncStatus(vaultData);
      if (status.state === 'synced') {
        setActionSuccessMsg('Vault is completely in sync with remote repository.');
      } else if (status.state === 'remote_ahead') {
        setActionSuccessMsg('Remote repository has new commits available. Click "Pull & 3-Way Merge".');
      } else if (status.state === 'local_ahead') {
        setActionSuccessMsg('Local vault has new changes ready to push.');
      } else if (status.state === 'diverged') {
        setActionSuccessMsg('Both remote and local have changes (diverged). Pull & 3-way merge is recommended.');
      } else if (status.error) {
        setActionErrorMsg(status.error);
      }
    } catch (err: any) {
      setActionErrorMsg(err.message || 'Failed to check remote status');
    } finally {
      setIsCheckingRemote(false);
    }
  };

  const handleTestRemoteConnection = async () => {
    setIsTestingConnection(true);
    setConnectionTestResult(null);
    setActionErrorMsg(null);

    if (tokenInput.trim()) {
      remoteSyncManager.setSessionToken(tokenInput.trim());
    }

    try {
      const result = await remoteSyncManager.testRemoteConnection();
      if (result.ok) {
        setConnectionTestResult({
          ok: true,
          message: `Connected successfully to "${result.repoName}" (default branch: ${result.defaultBranch})`,
        });
        // Fetch remote commits
        const history = await remoteSyncManager.getRemoteCommitHistory(10);
        setRemoteCommitLog(history);
      } else {
        setConnectionTestResult({
          ok: false,
          message: result.error || 'Connection failed',
        });
      }
    } catch (err: any) {
      setConnectionTestResult({
        ok: false,
        message: err.message || 'Failed to connect to remote repository',
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handlePullRemote = async () => {
    setIsProcessing(true);
    setProgressMsg('Pulling remote commits and performing 3-way merge...');
    setActionSuccessMsg(null);
    setActionErrorMsg(null);

    if (tokenInput.trim()) {
      remoteSyncManager.setSessionToken(tokenInput.trim());
    }

    try {
      const vaultData = await gatherCompleteVaultData();
      const res = await remoteSyncManager.pullAndMerge(vaultData);

      if (res.success) {
        await applyImportedVaultData(res.updatedVault);
        if (res.conflicts.length > 0) {
          setActiveConflicts(res.conflicts);
          setIsConflictModalOpen(true);
          setActionErrorMsg(`Pulled changes with ${res.conflicts.length} conflict(s). Please review and resolve.`);
        } else {
          setActionSuccessMsg(`Successfully synchronized! Pulled ${res.pulledCount} files from remote repository.`);
        }
        const history = await remoteSyncManager.getRemoteCommitHistory(10);
        setRemoteCommitLog(history);
      } else {
        setActionErrorMsg(res.error || 'Failed pulling from remote repository');
      }
    } catch (err: any) {
      setActionErrorMsg(err.message || 'Remote pull synchronization failed');
    } finally {
      setIsProcessing(false);
      setProgressMsg('');
    }
  };

  const handlePushRemote = async () => {
    setIsProcessing(true);
    setProgressMsg('Serializing vault and pushing Git commit to remote...');
    setActionSuccessMsg(null);
    setActionErrorMsg(null);

    if (tokenInput.trim()) {
      remoteSyncManager.setSessionToken(tokenInput.trim());
    }

    try {
      const vaultData = await gatherCompleteVaultData();
      const res = await remoteSyncManager.pushLocalVault(vaultData, remoteCommitMessage);

      if (res.success && res.remoteCommit) {
        setRemoteCommitMessage('');
        setActionSuccessMsg(`Successfully pushed snapshot [${res.remoteCommit.shortSha}] ("${res.remoteCommit.message}") to remote repository!`);
        const history = await remoteSyncManager.getRemoteCommitHistory(10);
        setRemoteCommitLog(history);
      } else {
        setActionErrorMsg(res.error || 'Failed pushing to remote repository');
      }
    } catch (err: any) {
      setActionErrorMsg(err.message || 'Remote push synchronization failed');
    } finally {
      setIsProcessing(false);
      setProgressMsg('');
    }
  };

  const handleResolveSingleConflict = (
    conflict: FileConflict,
    resolution: 'local' | 'remote' | 'both' | 'custom',
    customContent?: string
  ) => {
    remoteSyncManager.resolveConflict(conflict, resolution, customContent);
    const updated = remoteSyncManager.getActiveConflicts();
    setActiveConflicts(updated);
  };

  const handleApplyAllResolvedConflicts = async () => {
    const vaultData = await gatherCompleteVaultData();
    await applyImportedVaultData(vaultData);
    setActionSuccessMsg('Applied resolved conflict choices to active vault workspace!');
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden flex flex-col p-6 space-y-4 max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
              <FolderSync className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base flex items-center gap-2">
                Portable Vault & Local Versioning
              </h3>
              <p className="text-xs text-stone-400">
                Human-readable Markdown filesystem, local Git version control, and backup archives
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-stone-100 dark:border-stone-800 pb-1 text-xs">
          <button
            onClick={() => {
              setActiveTab('filesystem');
              setActionSuccessMsg(null);
              setActionErrorMsg(null);
            }}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === 'filesystem'
                ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200'
                : 'text-stone-500 hover:text-stone-800 dark:text-stone-400'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            Portable Filesystem
          </button>
          <button
            onClick={() => {
              setActiveTab('git');
              setActionSuccessMsg(null);
              setActionErrorMsg(null);
              loadGitOverview();
            }}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === 'git'
                ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200'
                : 'text-stone-500 hover:text-stone-800 dark:text-stone-400'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            Local Git
          </button>
          <button
            onClick={() => {
              setActiveTab('remote');
              setActionSuccessMsg(null);
              setActionErrorMsg(null);
            }}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === 'remote'
                ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200'
                : 'text-stone-500 hover:text-stone-800 dark:text-stone-400'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            Remote Git Sync
            {activeConflicts.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            )}
          </button>
          <button
            onClick={() => {
              setActiveTab('archives');
              setActionSuccessMsg(null);
              setActionErrorMsg(null);
            }}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === 'archives'
                ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200'
                : 'text-stone-500 hover:text-stone-800 dark:text-stone-400'
            }`}
          >
            <FileArchive className="w-3.5 h-3.5" />
            Archives
          </button>
          {onOpenDeviceSync && (
            <button
              onClick={() => {
                onClose();
                onOpenDeviceSync();
              }}
              className="px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors border border-dashed border-amber-300 dark:border-amber-800 ml-auto"
            >
              <Radio className="w-3.5 h-3.5" />
              Device Sync [Exp]
            </button>
          )}
        </div>

        {/* Status Alerts */}
        {actionSuccessMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
        )}
        {actionErrorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{actionErrorMsg}</span>
          </div>
        )}
        {isProcessing && (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-amber-500 animate-spin shrink-0" />
            <span>{progressMsg || 'Processing vault data...'}</span>
          </div>
        )}

        {/* Tab 1: Portable Filesystem */}
        {activeTab === 'filesystem' && (
          <div className="space-y-4 overflow-y-auto pr-1">
            <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-amber-500" />
                  <span className="font-semibold text-xs text-stone-800 dark:text-stone-200">
                    {folderName ? `Connected Folder: ${folderName}` : 'Local Folder Access'}
                  </span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300">
                  {capability.browserDescription}
                </span>
              </div>

              <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                The Portable Vault serializes your entire workspace into ordinary human-readable <code className="bg-stone-200/60 dark:bg-stone-700 px-1 py-0.5 rounded font-mono">.md</code> files (with YAML frontmatter and stable UUIDs), structured folders, attachment images, PDF papers, and canvas boards under a standard deterministic layout.
              </p>

              {capability.hasFileSystemAccess ? (
                <div className="space-y-2">
                  {!dirHandle ? (
                    <button
                      onClick={handleConnectFolder}
                      disabled={isProcessing}
                      className="w-full py-2.5 bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 dark:hover:bg-white text-white dark:text-stone-900 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors"
                    >
                      <FolderOpen className="w-4 h-4" /> Pick OS Vault Directory
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={handleExportToFolder}
                          disabled={isProcessing}
                          className="py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                        >
                          <Download className="w-4 h-4" /> Export Vault to Folder
                        </button>
                        <button
                          onClick={handleImportFromFolder}
                          disabled={isProcessing}
                          className="py-2.5 bg-stone-800 hover:bg-stone-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                        >
                          <Upload className="w-4 h-4" /> Import from Folder
                        </button>
                      </div>
                      <button
                        onClick={handleConnectFolder}
                        className="text-[11px] text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 underline"
                      >
                        Change Connected Directory
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[11px] text-amber-600 dark:text-amber-400">
                    Direct folder read/write is only available in Chromium browsers (Chrome, Edge). On Safari/Firefox, use the Directory Upload or universal ZIP export below.
                  </p>
                  <label className="w-full py-2.5 bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 dark:hover:bg-white text-white dark:text-stone-900 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-xs cursor-pointer">
                    <Upload className="w-4 h-4" /> Select Local Folder (Upload)
                    <input
                      type="file"
                      // @ts-ignore
                      webkitdirectory="true"
                      directory="true"
                      multiple
                      onChange={handleUniversalFolderInput}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Structure preview box */}
            <div className="p-3.5 rounded-xl bg-stone-900 text-stone-300 font-mono text-[11px] space-y-1">
              <div className="text-amber-400 font-bold text-xs pb-1 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Deterministic Vault Structure:
              </div>
              <div className="text-stone-400">vault/</div>
              <div className="pl-4 text-stone-300">├── notes/ <span className="text-stone-500"># Human-readable .md with YAML frontmatter</span></div>
              <div className="pl-4 text-stone-300">├── canvases/ <span className="text-stone-500"># Infinite spatial boards & visual diagrams</span></div>
              <div className="pl-4 text-stone-300">├── attachments/ <span className="text-stone-500"># Note images & PDF literature papers</span></div>
              <div className="pl-4 text-stone-300">└── metadata/manifest.json <span className="text-stone-500"># Checksums, folder mapping & settings</span></div>
            </div>
          </div>
        )}

        {/* Tab 2: Local Git Versioning */}
        {activeTab === 'git' && (
          <div className="space-y-4 overflow-y-auto pr-1">
            {/* Git Status Overview Bar */}
            <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                  <GitBranch className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-xs text-stone-800 dark:text-stone-200 flex items-center gap-2">
                    <span>Local Repository: <code className="font-mono text-amber-600 dark:text-amber-400">main</code></span>
                    {gitStatus?.clean ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-medium">
                        Working tree clean
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[10px] font-medium">
                        {(gitStatus?.modified.length || 0) + (gitStatus?.added.length || 0) + (gitStatus?.deleted.length || 0)} pending changes
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-stone-400">
                    Browser-sandboxed Git repository powered by isomorphic-git & LightningFS
                  </div>
                </div>
              </div>

              <button
                onClick={loadGitOverview}
                disabled={isGitLoading}
                className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300"
                title="Refresh Git status"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isGitLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Commit Form */}
            <form onSubmit={handleCreateGitCommit} className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700/60 space-y-3">
              <h4 className="font-semibold text-xs text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                <GitCommit className="w-4 h-4 text-amber-500" />
                Create Vault Snapshot (Git Commit)
              </h4>

              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Commit message (e.g. 'Updated sprint notes and roadmap')"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Author Name"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    className="px-3 py-1.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200"
                  />
                  <input
                    type="email"
                    placeholder="Author Email"
                    value={authorEmail}
                    onChange={(e) => setAuthorEmail(e.target.value)}
                    className="px-3 py-1.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="text-[11px] text-stone-400">
                  {gitStatus ? (
                    <span>
                      Mod: {gitStatus.modified.length} | Add: {gitStatus.added.length} | Del: {gitStatus.deleted.length}
                    </span>
                  ) : null}
                </div>
                <button
                  type="submit"
                  disabled={isGitLoading || !commitMessage.trim()}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <GitCommit className="w-3.5 h-3.5" />
                  {isGitLoading ? 'Saving...' : 'Commit Snapshot'}
                </button>
              </div>
            </form>

            {/* Commit History Log */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-stone-800 dark:text-stone-200">
                <span className="flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-stone-400" />
                  Commit History Log ({gitLog.length})
                </span>
              </div>

              {gitLog.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-stone-200 dark:border-stone-800 text-center text-xs text-stone-400">
                  No local Git commits yet. Create your first snapshot above!
                </div>
              ) : (
                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                  {gitLog.map((c) => (
                    <div
                      key={c.oid}
                      className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700/60 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <code className="px-1.5 py-0.5 rounded-md bg-stone-200 dark:bg-stone-700 font-mono text-[10px] text-amber-700 dark:text-amber-300 font-semibold">
                            {c.shortOid}
                          </code>
                          <span className="font-semibold text-stone-900 dark:text-stone-100 truncate">
                            {c.message}
                          </span>
                        </div>
                        <div className="text-[10px] text-stone-400">
                          {c.author.name} • {new Date(c.author.timestamp * 1000).toLocaleString()}
                        </div>
                      </div>

                      <button
                        onClick={() => setSelectedCommitToRestore(c)}
                        className="px-2.5 py-1 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-stone-700 dark:text-stone-300 text-[11px] font-medium flex items-center gap-1 shrink-0"
                      >
                        <RotateCcw className="w-3 h-3" /> Restore
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Restore Confirmation Dialog */}
            {selectedCommitToRestore && (
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 space-y-2 text-xs text-amber-900 dark:text-amber-200">
                <div className="font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  Restore Vault to Snapshot [{selectedCommitToRestore.shortOid}]?
                </div>
                <p className="text-[11px] leading-relaxed">
                  This will unpack all notes, folders, and attachments from commit <em>"{selectedCommitToRestore.message}"</em> into your active vault workspace.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleConfirmRestoreCommit}
                    disabled={isGitLoading}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold"
                  >
                    Confirm Restore
                  </button>
                  <button
                    onClick={() => setSelectedCommitToRestore(null)}
                    className="px-3 py-1.5 border border-amber-300 dark:border-amber-800 rounded-lg text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Remote Git-Compatible Synchronization */}
        {activeTab === 'remote' && (
          <div className="space-y-4 overflow-y-auto pr-1">
            {/* Sync Status Banner */}
            <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-xs text-stone-900 dark:text-stone-100 flex items-center gap-2">
                    <span>Provider: <span className="capitalize font-mono text-amber-600 dark:text-amber-400">{remoteProvider}</span></span>
                    {remoteSyncState === 'clean' && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> In Sync
                      </span>
                    )}
                    {remoteSyncState === 'conflict' && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 text-[10px] font-medium flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> {activeConflicts.length} Conflict(s)
                      </span>
                    )}
                    {remoteSyncState === 'error' && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 text-[10px] font-medium flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Error
                      </span>
                    )}
                    {remoteSyncState === 'idle' && (
                      <span className="px-2 py-0.5 rounded-full bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300 text-[10px]">
                        Ready
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-stone-400">
                    {remoteOwner && remoteRepo
                      ? `Target: ${remoteOwner}/${remoteRepo} (${remoteBranch})`
                      : 'Configure your repository details below'}
                  </div>
                </div>
              </div>

              {activeConflicts.length > 0 && (
                <button
                  onClick={() => setIsConflictModalOpen(true)}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs animate-bounce"
                >
                  <AlertTriangle className="w-3.5 h-3.5" /> Resolve Conflicts ({activeConflicts.length})
                </button>
              )}
            </div>

            {/* Quick Actions (Check / Pull / Push) */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleCheckRemoteStatus}
                disabled={isCheckingRemote || isProcessing || !tokenInput.trim() || !remoteOwner.trim() || !remoteRepo.trim()}
                className="py-2.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700 disabled:opacity-50 text-stone-800 dark:text-stone-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCheckingRemote ? 'animate-spin' : ''}`} />
                {isCheckingRemote ? 'Checking...' : 'Check Status'}
              </button>
              <button
                type="button"
                onClick={handlePullRemote}
                disabled={isProcessing || !tokenInput.trim() || !remoteOwner.trim() || !remoteRepo.trim()}
                className="py-2.5 bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 dark:hover:bg-white disabled:opacity-50 text-white dark:text-stone-900 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Pull & 3-Way Merge
              </button>
              <button
                type="button"
                onClick={handlePushRemote}
                disabled={isProcessing || !tokenInput.trim() || !remoteOwner.trim() || !remoteRepo.trim()}
                className="py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
              >
                <Upload className="w-3.5 h-3.5" /> Push Vault Commit
              </button>
            </div>

            {/* Safety notice for push */}
            {vaultEncryptionService.isEncryptionEnabled() && (
              <div className="px-3 py-2 rounded-xl bg-stone-100 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700/60 text-[11px] text-stone-600 dark:text-stone-300 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Plaintext Git Remote:</strong> Pushing to a standard Git repository uploads Markdown files and assets in plaintext format. Ensure your remote repository is private.
                </span>
              </div>
            )}

            {/* Optional Push Commit Message */}
            <input
              type="text"
              placeholder="Push commit message (optional, defaults to timestamp snapshot)"
              value={remoteCommitMessage}
              onChange={(e) => setRemoteCommitMessage(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200"
            />

            {/* Remote Repository Configuration Form */}
            <form onSubmit={handleSaveRemoteConfig} className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-xs text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                  <GitBranch className="w-4 h-4 text-amber-500" />
                  Remote Repository Configuration
                </h4>
                <button
                  type="button"
                  onClick={handleTestRemoteConnection}
                  disabled={isTestingConnection || !tokenInput.trim()}
                  className="px-2.5 py-1 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-50 text-stone-700 dark:text-stone-300 text-[11px] font-medium flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${isTestingConnection ? 'animate-spin' : ''}`} />
                  {isTestingConnection ? 'Testing...' : 'Test Connection'}
                </button>
              </div>

              {connectionTestResult && (
                <div
                  className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                    connectionTestResult.ok
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800'
                  }`}
                >
                  {connectionTestResult.ok ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  )}
                  <span>{connectionTestResult.message}</span>
                </div>
              )}

              {/* Provider Selector */}
              <div className="grid grid-cols-3 gap-2">
                {(['github', 'gitlab', 'gitea'] as GitProvider[]).map((prov) => (
                  <button
                    key={prov}
                    type="button"
                    onClick={() => setRemoteProvider(prov)}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold capitalize flex items-center justify-center gap-1.5 transition-colors ${
                      remoteProvider === prov
                        ? 'bg-amber-500 border-amber-500 text-white'
                        : 'border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    {prov === 'github' ? 'GitHub' : prov === 'gitlab' ? 'GitLab' : 'Gitea / Forgejo'}
                  </button>
                ))}
              </div>

              {/* Fields */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-300">
                    Owner / Org
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. username or organization"
                    value={remoteOwner}
                    onChange={(e) => setRemoteOwner(e.target.value)}
                    required
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-300">
                    Repository Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. keepnotes-vault"
                    value={remoteRepo}
                    onChange={(e) => setRemoteRepo(e.target.value)}
                    required
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-300">
                    Branch
                  </label>
                  <input
                    type="text"
                    placeholder="main"
                    value={remoteBranch}
                    onChange={(e) => setRemoteBranch(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200"
                  />
                </div>

                {(remoteProvider === 'gitlab' || remoteProvider === 'gitea') && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-300">
                      Instance Base URL
                    </label>
                    <input
                      type="url"
                      placeholder={remoteProvider === 'gitlab' ? 'https://gitlab.com' : 'https://gitea.example.com'}
                      value={remoteBaseUrl}
                      onChange={(e) => setRemoteBaseUrl(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200"
                    />
                  </div>
                )}
              </div>

              {/* Session Token / Security Notice */}
              <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-amber-600" />
                    Personal Access Token (PAT)
                  </label>
                  <span className="text-[10px] text-amber-700 dark:text-amber-300 flex items-center gap-1 font-mono">
                    <Lock className="w-3 h-3" /> Non-Plaintext Storage
                  </span>
                </div>

                <div className="relative flex items-center">
                  <input
                    type={showToken ? 'text' : 'password'}
                    placeholder={
                      remoteProvider === 'github'
                        ? 'ghp_... or github_pat_...'
                        : remoteProvider === 'gitlab'
                        ? 'glpat-...'
                        : 'Access token'
                    }
                    value={tokenInput}
                    onChange={(e) => {
                      setTokenInput(e.target.value);
                      remoteSyncManager.setSessionToken(e.target.value);
                    }}
                    className="w-full pl-3 pr-10 py-1.5 text-xs rounded-xl border border-amber-200 dark:border-amber-900/50 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-2.5 p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors"
                    title={showToken ? 'Hide token' : 'Show token'}
                  >
                    {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Token Validation Feedback */}
                {tokenInput.trim() && (
                  (() => {
                    const validation = hardenedTokenStorage.validateTokenFormat(tokenInput, remoteProvider);
                    return (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-stone-500 dark:text-stone-400">Detected format:</span>
                          <span className="font-semibold text-amber-800 dark:text-amber-300 font-mono">
                            {validation.typeDescription}
                          </span>
                        </div>
                        {validation.warnings.length > 0 && (
                          <div className="text-[10px] text-amber-700 dark:text-amber-400 flex items-start gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
                            <span>{validation.warnings[0]}</span>
                          </div>
                        )}
                      </div>
                    );
                  })()
                )}

                {/* Encrypted with Vault Key Option */}
                {vaultEncryptionService.isEncryptionEnabled() && (
                  <label className="flex items-center gap-2 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={saveEncryptedWithVault}
                      onChange={(e) => setSaveEncryptedWithVault(e.target.checked)}
                      className="rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                    />
                    <span className="text-[11px] text-amber-950 dark:text-amber-200 font-medium">
                      Persist token encrypted at rest using active Vault AES-256-GCM master key
                    </span>
                  </label>
                )}

                <p className="text-[10px] text-amber-800/80 dark:text-amber-300/80 leading-normal">
                  Your credentials are never stored in plaintext localStorage. When vault locks, all in-memory tokens are immediately purged.
                </p>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-4 py-2 bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 dark:hover:bg-white text-white dark:text-stone-900 rounded-xl text-xs font-semibold shadow-xs"
                >
                  Save Repository Settings
                </button>
              </div>
            </form>

            {/* Remote Commit History */}
            {remoteCommitLog.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-stone-800 dark:text-stone-200">
                  <span className="flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-stone-400" />
                    Remote Commit Log ({remoteCommitLog.length})
                  </span>
                </div>

                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {remoteCommitLog.map((c) => (
                    <div
                      key={c.sha}
                      className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700/60 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <code className="px-1.5 py-0.5 rounded-md bg-stone-200 dark:bg-stone-700 font-mono text-[10px] text-amber-700 dark:text-amber-300 font-semibold">
                            {c.shortSha}
                          </code>
                          <span className="font-semibold text-stone-900 dark:text-stone-100 truncate">
                            {c.message}
                          </span>
                        </div>
                        <div className="text-[10px] text-stone-400">
                          {c.author.name} • {new Date(c.author.date).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Compatibility Matrix Accordion */}
            <div className="border border-stone-200 dark:border-stone-700/60 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowMatrix(!showMatrix)}
                className="w-full p-3 bg-stone-50 dark:bg-stone-800/50 flex items-center justify-between text-xs font-semibold text-stone-800 dark:text-stone-200"
              >
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  Provider & Browser Transport Security Matrix
                </span>
                {showMatrix ? <ChevronUp className="w-3.5 h-3.5 text-stone-400" /> : <ChevronDown className="w-3.5 h-3.5 text-stone-400" />}
              </button>

              {showMatrix && (
                <div className="p-3 space-y-3 bg-white dark:bg-stone-900 text-xs">
                  <div className="space-y-2">
                    {Object.values(PROVIDER_CAPABILITIES).map((cap) => (
                      <div key={cap.provider} className="p-2.5 rounded-lg bg-stone-50 dark:bg-stone-800/40 border border-stone-100 dark:border-stone-800 text-[11px] space-y-1">
                        <div className="font-semibold text-stone-900 dark:text-stone-100 flex items-center justify-between">
                          <span>{cap.name}</span>
                          <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-medium">
                            {cap.testedStatus === 'tested' ? 'Tested' : cap.testedStatus}
                          </span>
                        </div>
                        <p className="text-stone-500 dark:text-stone-400 leading-normal">{cap.notes}</p>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-stone-100 dark:border-stone-800 text-[10px] text-stone-400">
                    Direct Browser-to-Git REST APIs bypass CORS restrictions safely without transmitting repository credentials through third-party proxy relays.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Universal Archive Backups */}
        {activeTab === 'archives' && (
          <div className="space-y-4 overflow-y-auto pr-1">
            {/* Universal ZIP */}
            <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700/60 space-y-3">
              <div className="space-y-0.5">
                <h4 className="font-semibold text-xs text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                  <FileArchive className="w-4 h-4 text-amber-500" />
                  Universal Portable Vault ZIP Archive
                </h4>
                <p className="text-[11px] text-stone-400">
                  Exports and imports all {notes.length} notes, folders, canvas boards, PDF papers, images, and manifest.json in a standalone zip archive.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleDownloadVaultZip}
                  disabled={isProcessing}
                  className="py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Download Vault ZIP
                </button>

                <label className="py-2.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 hover:border-amber-400 text-stone-800 dark:text-stone-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5" /> Restore Vault ZIP
                  <input
                    type="file"
                    accept=".zip"
                    onChange={handleImportVaultZip}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Quick Database JSON */}
            <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700/60 space-y-3">
              <div className="space-y-0.5">
                <h4 className="font-semibold text-xs text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                  <HardDrive className="w-4 h-4 text-sky-500" />
                  Full Database Snapshot (JSON)
                </h4>
                <p className="text-[11px] text-stone-400">
                  Single-file raw JSON backup of all database stores.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleExportJson}
                  className="py-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 hover:border-amber-400 text-stone-800 dark:text-stone-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Save JSON Backup
                </button>

                <label className="py-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 hover:border-amber-400 text-stone-800 dark:text-stone-200 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5" /> Restore JSON Backup
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleRestoreJson}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex justify-end pt-2 border-t border-stone-100 dark:border-stone-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-semibold hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Interactive Conflict Resolution Dialog */}
      <ConflictResolverModal
        isOpen={isConflictModalOpen}
        onClose={() => setIsConflictModalOpen(false)}
        conflicts={activeConflicts}
        onResolveConflict={handleResolveSingleConflict}
        onApplyAllResolved={handleApplyAllResolvedConflicts}
      />
    </div>
  );
};
