import {
  GitProvider,
  SyncState,
  RemoteRepoConfig,
  RemoteCredentials,
  FileConflict,
  SyncResult,
  RemoteCommitRef,
  SyncStatusDetails,
  CredentialStorageMode,
} from './remoteGitTypes';
import {
  PortableVaultData,
  PortableFileEntry,
} from './portableVaultTypes';
import {
  serializePortableVault,
  deserializePortableVault,
  serializeNoteToMarkdown,
  computeDeterministicChecksum,
} from './portableVaultSerializer';
import { merge3Text, areBinaryContentsEqual, applyConflictResolution } from './mergeEngine';
import { gitHubAdapter } from './remoteGitAdapters/githubAdapter';
import { gitLabAdapter } from './remoteGitAdapters/gitlabAdapter';
import { giteaAdapter } from './remoteGitAdapters/giteaAdapter';
import { smartHttpAdapter } from './remoteGitAdapters/smartHttpAdapter';
import { vaultEncryptionService } from './encryption/vaultEncryptionService';
import { exportEncryptedVaultContainer } from './encryption/encryptedVaultExport';
import { hardenedTokenStorage } from './security/tokenStorage';
import { vaultPurgeManager } from './security/vaultPurge';
import { Note } from '../types';

const CONFIG_STORAGE_KEY = 'keepnotes_remote_git_config';

export class RemoteSyncManager {
  private config: RemoteRepoConfig | null = null;
  private state: SyncState = 'unconfigured';
  private lastSyncedCommitSha: string | null = null;
  private lastSyncedAt: string | null = null;
  private lastCheckedAt: string | null = null;
  private remoteHeadCommit: RemoteCommitRef | null = null;
  private lastSyncedFileChecksums = new Map<string, string>(); // path -> checksum at last sync
  private activeConflicts: FileConflict[] = [];
  private lastError: string | null = null;
  private statusListeners: Array<(state: SyncState, result?: SyncResult) => void> = [];
  private autoSyncTimerId: any = null;

  constructor() {
    this.loadSavedConfig();
    this.setupLockSubscriber();
    this.setupNetworkListeners();
    this.updateInitialState();
  }

  // --- State Initialization & Setup ---

  private updateInitialState() {
    if (!this.isConfigured()) {
      this.state = 'unconfigured';
    } else if (!this.isAuthenticated()) {
      this.state = 'auth_required';
    } else if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.state = 'offline';
    } else {
      this.state = 'idle';
    }
  }

  private setupLockSubscriber() {
    // When vault is locked, purge in-memory credentials and cached sync states
    vaultPurgeManager.registerPurgeCallback(() => {
      this.clearSessionToken();
      this.activeConflicts = [];
      this.remoteHeadCommit = null;
      this.updateInitialState();
    });

    vaultEncryptionService.subscribeLockStateChange(async (status) => {
      if (status === 'locked') {
        this.clearSessionToken();
        this.activeConflicts = [];
        this.updateInitialState();
      } else if (status === 'unlocked') {
        // Attempt to auto-load encrypted token if saved
        const vaultKey = vaultEncryptionService.getActiveKey();
        if (vaultKey && hardenedTokenStorage.hasEncryptedToken()) {
          const loadedToken = await hardenedTokenStorage.loadEncryptedToken(vaultKey);
          if (loadedToken) {
            this.updateInitialState();
            this.notifyListeners(this.state);
          }
        }
      }
    });
  }

  private setupNetworkListeners() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      if (this.state === 'offline') {
        this.updateInitialState();
        this.notifyListeners(this.state);
      }
    });

    window.addEventListener('offline', () => {
      this.state = 'offline';
      this.notifyListeners('offline');
    });
  }

  // --- Configuration & Security ---

  private loadSavedConfig() {
    try {
      const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Security guarantee: never allow credentials in plaintext localStorage
        delete (parsed as any).token;
        delete (parsed as any).password;
        delete (parsed as any).secret;
        this.config = parsed;
      }
    } catch {
      this.config = null;
    }
  }

  public saveConfig(config: RemoteRepoConfig) {
    const safeConfig: RemoteRepoConfig = {
      provider: config.provider,
      owner: config.owner.trim(),
      repo: config.repo.trim(),
      branch: config.branch.trim() || 'main',
      baseUrl: config.baseUrl?.trim(),
      corsProxyUrl: config.corsProxyUrl?.trim(),
      authorName: config.authorName?.trim(),
      authorEmail: config.authorEmail?.trim(),
      syncMode: config.syncMode || 'plaintext',
      allowDecryptedPlaintextPush: config.allowDecryptedPlaintextPush || false,
      autoSyncIntervalMinutes: config.autoSyncIntervalMinutes || 0,
      credentialStorageMode: config.credentialStorageMode || 'session_memory',
    };

    this.config = safeConfig;
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(safeConfig));
    this.updateInitialState();
    this.restartAutoSyncTimer();
  }

  public getConfig(): RemoteRepoConfig | null {
    return this.config ? { ...this.config } : null;
  }

  // --- Hardened Credential Access ---

  public setSessionToken(token: string | null) {
    hardenedTokenStorage.setSessionToken(token, this.config?.provider);
    this.updateInitialState();
    this.notifyListeners(this.state);
  }

  public getSessionToken(): string | null {
    return hardenedTokenStorage.getSessionToken();
  }

  public async saveEncryptedTokenWithVaultKey(token: string, vaultKey: CryptoKey): Promise<void> {
    await hardenedTokenStorage.saveEncryptedToken(token, vaultKey);
    this.updateInitialState();
    this.notifyListeners(this.state);
  }

  public clearSessionToken() {
    hardenedTokenStorage.clearSessionToken();
    this.updateInitialState();
    this.notifyListeners(this.state);
  }

  public deleteEncryptedToken() {
    hardenedTokenStorage.deleteEncryptedToken();
    this.clearSessionToken();
  }

  public hasSavedEncryptedToken(): boolean {
    return hardenedTokenStorage.hasEncryptedToken();
  }

  public isConfigured(): boolean {
    return Boolean(this.config && this.config.owner && this.config.repo);
  }

  public isAuthenticated(): boolean {
    const token = hardenedTokenStorage.getSessionToken();
    return Boolean(token && token.length > 0);
  }

  public getState(): SyncState {
    return this.state;
  }

  public getActiveConflicts(): FileConflict[] {
    return [...this.activeConflicts];
  }

  public getLastError(): string | null {
    return this.lastError;
  }

  public getLastSyncedCommitSha(): string | null {
    return this.lastSyncedCommitSha;
  }

  public getStatusDetails(localVault?: PortableVaultData): SyncStatusDetails {
    let unpushedChangesCount = 0;
    if (localVault && this.lastSyncedFileChecksums.size > 0) {
      for (const note of localVault.notes) {
        const folderMap = new Map(localVault.folders.map((f) => [f.id, f.name]));
        const md = serializeNoteToMarkdown(note, folderMap);
        const currentSum = computeDeterministicChecksum(md);
        const lastSum = this.lastSyncedFileChecksums.get(`note-${note.id}`);
        if (!lastSum || lastSum !== currentSum) {
          unpushedChangesCount++;
        }
      }
    }

    return {
      state: this.state,
      isConfigured: this.isConfigured(),
      isAuthenticated: this.isAuthenticated(),
      lastSyncedAt: this.lastSyncedAt || undefined,
      lastCheckedAt: this.lastCheckedAt || undefined,
      lastSyncedCommitSha: this.lastSyncedCommitSha || undefined,
      remoteHeadCommit: this.remoteHeadCommit || undefined,
      unpushedChangesCount,
      unresolvedConflictsCount: this.activeConflicts.length,
      message: this.lastError || (this.state === 'synced' ? 'Vault in sync' : `Status: ${this.state}`),
      error: this.lastError || undefined,
    };
  }

  public addStatusListener(listener: (state: SyncState, result?: SyncResult) => void) {
    this.statusListeners.push(listener);
    return () => {
      this.statusListeners = this.statusListeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(state: SyncState, result?: SyncResult) {
    this.state = state;
    for (const listener of this.statusListeners) {
      try {
        listener(state, result);
      } catch (e) {
        console.error('Sync listener error:', e);
      }
    }
  }

  // --- Provider Dispatcher ---

  private getAdapter(provider: GitProvider) {
    switch (provider) {
      case 'github':
        return gitHubAdapter;
      case 'gitlab':
        return gitLabAdapter;
      case 'gitea':
        return giteaAdapter;
      case 'custom_http':
        return smartHttpAdapter as any;
      default:
        return gitHubAdapter;
    }
  }

  // --- Auto-Sync Interval Runner ---

  private restartAutoSyncTimer() {
    if (this.autoSyncTimerId) {
      clearInterval(this.autoSyncTimerId);
      this.autoSyncTimerId = null;
    }

    const intervalMinutes = this.config?.autoSyncIntervalMinutes || 0;
    if (intervalMinutes > 0 && typeof window !== 'undefined') {
      this.autoSyncTimerId = setInterval(() => {
        // Only auto-sync when conditions are safe
        if (
          this.isConfigured() &&
          this.isAuthenticated() &&
          !vaultEncryptionService.isVaultLocked() &&
          navigator.onLine &&
          this.state !== 'syncing' &&
          this.state !== 'syncing_pull' &&
          this.state !== 'syncing_push' &&
          this.state !== 'conflict'
        ) {
          // Trigger check/sync notification
          this.notifyListeners('checking');
        }
      }, intervalMinutes * 60 * 1000);
    }
  }

  /**
   * Test remote connectivity and authentication
   */
  async testRemoteConnection(): Promise<{ ok: boolean; repoName: string; defaultBranch: string; error?: string }> {
    if (!this.config) {
      return { ok: false, repoName: '', defaultBranch: '', error: 'Remote repository configuration is missing.' };
    }
    const token = this.getSessionToken();
    if (!token) {
      return { ok: false, repoName: '', defaultBranch: '', error: 'Access token is missing. Please provide a Personal Access Token.' };
    }

    try {
      const adapter = this.getAdapter(this.config.provider);
      const res = await adapter.testConnection(this.config, token);
      if (res.ok) {
        this.lastError = null;
        if (this.state === 'auth_required' || this.state === 'error') {
          this.state = 'idle';
          this.notifyListeners('idle');
        }
      } else {
        this.lastError = res.error || 'Connection failed';
      }
      return res;
    } catch (e: any) {
      this.lastError = e.message || 'Connection failed';
      return { ok: false, repoName: this.config.repo, defaultBranch: 'main', error: this.lastError };
    }
  }

  /**
   * Check for remote updates without downloading entire repository.
   * Compares remote HEAD with last synced commit SHA and local changes.
   */
  async checkSyncStatus(
    localVault: PortableVaultData
  ): Promise<{
    state: SyncState;
    remoteHead?: RemoteCommitRef;
    hasRemoteChanges: boolean;
    hasLocalChanges: boolean;
    error?: string;
  }> {
    if (!this.isConfigured()) {
      this.state = 'unconfigured';
      return { state: 'unconfigured', hasRemoteChanges: false, hasLocalChanges: false };
    }
    const token = this.getSessionToken();
    if (!token) {
      this.state = 'auth_required';
      return { state: 'auth_required', hasRemoteChanges: false, hasLocalChanges: false, error: 'Authentication token required' };
    }
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.state = 'offline';
      return { state: 'offline', hasRemoteChanges: false, hasLocalChanges: false, error: 'Offline' };
    }

    this.notifyListeners('checking');
    this.lastCheckedAt = new Date().toISOString();

    try {
      const adapter = this.getAdapter(this.config!.provider);
      const remoteHead = await adapter.getHeadCommit(this.config!, token);
      this.remoteHeadCommit = remoteHead;

      // Check if remote has changed
      const isRemoteAhead = Boolean(
        remoteHead &&
        this.lastSyncedCommitSha &&
        remoteHead.sha !== this.lastSyncedCommitSha
      );

      // Check if local has changed
      let hasLocalChanges = false;
      if (this.lastSyncedFileChecksums.size === 0) {
        hasLocalChanges = localVault.notes.length > 0;
      } else {
        for (const note of localVault.notes) {
          const folderMap = new Map(localVault.folders.map((f) => [f.id, f.name]));
          const md = serializeNoteToMarkdown(note, folderMap);
          const currentSum = computeDeterministicChecksum(md);
          const lastSum = this.lastSyncedFileChecksums.get(`note-${note.id}`);
          if (!lastSum || lastSum !== currentSum) {
            hasLocalChanges = true;
            break;
          }
        }
      }

      let determinedState: SyncState = 'clean';
      if (this.activeConflicts.length > 0) {
        determinedState = 'conflict';
      } else if (isRemoteAhead && hasLocalChanges) {
        determinedState = 'diverged';
      } else if (isRemoteAhead) {
        determinedState = 'remote_ahead';
      } else if (hasLocalChanges) {
        determinedState = 'local_ahead';
      } else {
        determinedState = 'synced';
      }

      this.notifyListeners(determinedState);
      return {
        state: determinedState,
        remoteHead: remoteHead || undefined,
        hasRemoteChanges: isRemoteAhead,
        hasLocalChanges,
      };
    } catch (err: any) {
      this.lastError = err.message || 'Failed to check remote repository status';
      this.notifyListeners('error', {
        success: false,
        state: 'error',
        pulledCount: 0,
        pushedCount: 0,
        conflicts: [],
        message: this.lastError,
        error: this.lastError,
      });
      return {
        state: 'error',
        hasRemoteChanges: false,
        hasLocalChanges: false,
        error: this.lastError,
      };
    }
  }

  /**
   * Fetch commit log from remote
   */
  async getRemoteCommitHistory(depth = 25): Promise<RemoteCommitRef[]> {
    const token = this.getSessionToken();
    if (!this.config || !token) return [];
    try {
      const adapter = this.getAdapter(this.config.provider);
      return await adapter.getCommitHistory(this.config, token, depth);
    } catch {
      return [];
    }
  }

  // --- Pull & 3-Way Merge Operations ---

  /**
   * Pulls latest changes from remote repository and performs 3-way merge against active local vault
   */
  async pullAndMerge(
    localVault: PortableVaultData
  ): Promise<{
    success: boolean;
    updatedVault: PortableVaultData;
    conflicts: FileConflict[];
    pulledCount: number;
    remoteCommit?: RemoteCommitRef;
    error?: string;
  }> {
    if (!this.config) {
      return { success: false, updatedVault: localVault, conflicts: [], pulledCount: 0, error: 'Remote not configured' };
    }
    const token = this.getSessionToken();
    if (!token) {
      this.notifyListeners('auth_required');
      return { success: false, updatedVault: localVault, conflicts: [], pulledCount: 0, error: 'Authentication token required' };
    }

    this.notifyListeners('syncing_pull');
    this.lastError = null;
    this.activeConflicts = [];

    try {
      const adapter = this.getAdapter(this.config.provider);
      const { files: remoteFiles, headCommit } = await adapter.fetchRemoteFiles(this.config, token);

      if (remoteFiles.length === 0 && !headCommit) {
        this.notifyListeners('synced');
        return {
          success: true,
          updatedVault: localVault,
          conflicts: [],
          pulledCount: 0,
        };
      }

      // Check if remote files represent an encrypted container
      const encContainer = remoteFiles.find((f) => f.path === 'vault.enc');
      if (encContainer && this.config.syncMode === 'encrypted_container') {
        // Handled via encrypted container import flow
      }

      // Deserialize remote snapshot to structured entities
      const remotePortable = await deserializePortableVault(remoteFiles);

      // Maps for Note Identity Resolution (by ID and title)
      const localNotesById = new Map<string, Note>(localVault.notes.map((n) => [n.id, n]));
      const remoteNotesById = new Map<string, Note>(remotePortable.notes.map((n) => [n.id, n]));
      const mergedNotesMap = new Map<string, Note>();
      const detectedConflicts: FileConflict[] = [];

      // 1. Process Notes
      for (const [id, remoteNote] of remoteNotesById.entries()) {
        const localNote = localNotesById.get(id);

        if (!localNote) {
          // Note created remotely -> accept cleanly
          mergedNotesMap.set(id, remoteNote);
        } else {
          // Note exists on both sides -> Check if contents match
          const folderMap = new Map(localVault.folders.map((f) => [f.id, f.name]));
          const localMd = serializeNoteToMarkdown(localNote, folderMap);
          const remoteMd = serializeNoteToMarkdown(remoteNote, folderMap);

          if (localMd === remoteMd) {
            // Identical
            mergedNotesMap.set(id, localNote);
          } else {
            // Contents differ -> Run 3-Way Merge
            const baseChecksum = this.lastSyncedFileChecksums.get(`note-${id}`);
            const mergeResult = merge3Text('', localMd, remoteMd);

            if (mergeResult.clean) {
              // Merged cleanly without overlap
              mergedNotesMap.set(id, {
                ...localNote,
                content: mergeResult.mergedText,
                updatedAt: new Date().toISOString(),
              });
            } else {
              // Conflicted! Register conflict and hold for user resolution
              const conflict: FileConflict = {
                path: `notes/${remoteNote.title || 'note'}.md`,
                fileType: 'markdown',
                localContent: localMd,
                remoteContent: remoteMd,
                mergedContent: mergeResult.mergedText,
                status: 'unresolved',
                noteId: id,
                noteTitle: localNote.title || remoteNote.title,
              };
              detectedConflicts.push(conflict);
              mergedNotesMap.set(id, localNote);
            }
          }
        }
      }

      // Check notes created locally (not present on remote)
      for (const [id, localNote] of localNotesById.entries()) {
        if (!remoteNotesById.has(id)) {
          mergedNotesMap.set(id, localNote);
        }
      }

      // 2. Process Folders (Union of both)
      const folderMap = new Map(localVault.folders.map((f) => [f.id, f]));
      for (const rf of remotePortable.folders) {
        if (!folderMap.has(rf.id)) {
          folderMap.set(rf.id, rf);
        }
      }

      // 3. Process Canvases & PDFs
      const mergedCanvases = [...(localVault.canvases || [])];
      if (remotePortable.canvases) {
        const localCanvasIds = new Set(mergedCanvases.map((c) => c.id));
        for (const rc of remotePortable.canvases) {
          if (!localCanvasIds.has(rc.id)) {
            mergedCanvases.push(rc);
          }
        }
      }

      const mergedPdfAttachments = [...(localVault.pdfAttachments || [])];
      if (remotePortable.pdfAttachments) {
        const localPdfIds = new Set(mergedPdfAttachments.map((p) => p.meta.id));
        for (const rpdf of remotePortable.pdfAttachments) {
          if (!localPdfIds.has(rpdf.meta.id)) {
            mergedPdfAttachments.push(rpdf);
          }
        }
      }

      const updatedVault: PortableVaultData = {
        notes: Array.from(mergedNotesMap.values()),
        folders: Array.from(folderMap.values()),
        savedSearches: localVault.savedSearches,
        settings: localVault.settings,
        canvases: mergedCanvases.length > 0 ? mergedCanvases : undefined,
        pdfAttachments: mergedPdfAttachments.length > 0 ? mergedPdfAttachments : undefined,
      };

      if (headCommit) {
        this.lastSyncedCommitSha = headCommit.sha;
        this.remoteHeadCommit = headCommit;
      }
      this.lastSyncedAt = new Date().toISOString();

      // Update baseline checksums
      for (const note of updatedVault.notes) {
        const fMap = new Map(updatedVault.folders.map((f) => [f.id, f.name]));
        const md = serializeNoteToMarkdown(note, fMap);
        this.lastSyncedFileChecksums.set(`note-${note.id}`, computeDeterministicChecksum(md));
      }

      if (detectedConflicts.length > 0) {
        this.activeConflicts = detectedConflicts;
        this.notifyListeners('conflict', {
          success: true,
          state: 'conflict',
          pulledCount: remoteFiles.length,
          pushedCount: 0,
          conflicts: detectedConflicts,
          remoteCommit: headCommit || undefined,
          message: `Pulled remote changes with ${detectedConflicts.length} conflicts.`,
        });
      } else {
        this.notifyListeners('synced', {
          success: true,
          state: 'synced',
          pulledCount: remoteFiles.length,
          pushedCount: 0,
          conflicts: [],
          remoteCommit: headCommit || undefined,
          message: 'Synchronized successfully with remote repository.',
        });
      }

      return {
        success: true,
        updatedVault,
        conflicts: detectedConflicts,
        pulledCount: remoteFiles.length,
        remoteCommit: headCommit || undefined,
      };
    } catch (e: any) {
      this.lastError = e.message || 'Pull synchronization failed';
      this.notifyListeners('error', {
        success: false,
        state: 'error',
        pulledCount: 0,
        pushedCount: 0,
        conflicts: [],
        message: this.lastError,
        error: this.lastError,
      });

      return {
        success: false,
        updatedVault: localVault,
        conflicts: [],
        pulledCount: 0,
        error: this.lastError,
      };
    }
  }

  // --- Push Operations ---

  /**
   * Pushes the active vault state to the remote repository.
   * Enforces pre-flight remote HEAD validation to prevent blind overwrites.
   */
  async pushLocalVault(
    vaultData: PortableVaultData,
    commitMessage?: string,
    forcePush = false
  ): Promise<{
    success: boolean;
    remoteCommit?: RemoteCommitRef;
    pushedCount: number;
    error?: string;
  }> {
    if (!this.config) {
      return { success: false, pushedCount: 0, error: 'Remote not configured' };
    }
    const token = this.getSessionToken();
    if (!token) {
      this.notifyListeners('auth_required');
      return { success: false, pushedCount: 0, error: 'Authentication token required' };
    }

    if (vaultEncryptionService.isVaultLocked()) {
      return { success: false, pushedCount: 0, error: 'Vault is currently locked. Unlock your vault to synchronize.' };
    }

    if (
      vaultEncryptionService.isEncryptionEnabled() &&
      this.config.syncMode !== 'encrypted_container' &&
      !this.config.allowDecryptedPlaintextPush
    ) {
      return {
        success: false,
        pushedCount: 0,
        error:
          'Vault client-side encryption is active. To prevent leaking decrypted plaintext to a public or shared Git repository, enable "allowDecryptedPlaintextPush" or choose encrypted container sync mode.',
      };
    }

    this.notifyListeners('syncing_push');
    this.lastError = null;

    try {
      const adapter = this.getAdapter(this.config.provider);

      // Verify remote HEAD to prevent blind overwrite unless force push requested
      if (!forcePush) {
        const currentRemoteHead = await adapter.getHeadCommit(this.config, token);
        if (
          currentRemoteHead &&
          this.lastSyncedCommitSha &&
          currentRemoteHead.sha !== this.lastSyncedCommitSha
        ) {
          throw new Error('Remote repository has newer changes. Please pull and merge before pushing.');
        }
      }

      // Serialize local vault
      let files: PortableFileEntry[];
      if (this.config.syncMode === 'encrypted_container') {
        const encryptedBlob = await exportEncryptedVaultContainer(vaultData);
        const arrayBuf = await encryptedBlob.arrayBuffer();
        files = [
          {
            path: 'vault.enc',
            content: new Uint8Array(arrayBuf),
            isBinary: true,
          },
          {
            path: 'README.md',
            content: `# KeepNotes Encrypted Vault Backup\n\nThis repository contains an end-to-end encrypted KeepNotes vault backup container (\`vault.enc\`).\nEncrypted with AES-256-GCM and Argon2id KDF.\n`,
            isBinary: false,
          },
        ];
      } else {
        const serialized = await serializePortableVault(vaultData);
        files = serialized.files;
      }

      const message = commitMessage?.trim() || `Vault snapshot update (${new Date().toLocaleString()})`;
      const author = {
        name: this.config.authorName || 'KeepNotes User',
        email: this.config.authorEmail || 'user@vault.local',
      };

      const newCommit = await adapter.pushVaultCommit(
        this.config,
        token,
        files,
        message,
        author
      );

      this.lastSyncedCommitSha = newCommit.sha;
      this.remoteHeadCommit = newCommit;
      this.lastSyncedAt = new Date().toISOString();

      // Update baseline checksums
      for (const note of vaultData.notes) {
        const folderMap = new Map(vaultData.folders.map((f) => [f.id, f.name]));
        const md = serializeNoteToMarkdown(note, folderMap);
        this.lastSyncedFileChecksums.set(`note-${note.id}`, computeDeterministicChecksum(md));
      }

      this.notifyListeners('synced', {
        success: true,
        state: 'synced',
        pulledCount: 0,
        pushedCount: files.length,
        conflicts: [],
        remoteCommit: newCommit,
        message: `Successfully pushed snapshot [${newCommit.shortSha}] to ${this.config.provider}`,
      });

      return {
        success: true,
        remoteCommit: newCommit,
        pushedCount: files.length,
      };
    } catch (e: any) {
      this.lastError = e.message || 'Push synchronization failed';
      this.notifyListeners('error', {
        success: false,
        state: 'error',
        pulledCount: 0,
        pushedCount: 0,
        conflicts: [],
        message: this.lastError,
        error: this.lastError,
      });

      return {
        success: false,
        pushedCount: 0,
        error: this.lastError,
      };
    }
  }

  /**
   * Resolves an individual conflict and removes it from the active conflicts list
   */
  resolveConflict(
    conflict: FileConflict,
    resolution: 'local' | 'remote' | 'both' | 'custom',
    customContent?: string | Uint8Array
  ) {
    applyConflictResolution(conflict, resolution, customContent);
    this.activeConflicts = this.activeConflicts.filter((c) => c !== conflict);

    if (this.activeConflicts.length === 0 && (this.state === 'conflict' || this.state === 'idle')) {
      this.notifyListeners('synced');
    }
  }
}

export const remoteSyncManager = new RemoteSyncManager();
