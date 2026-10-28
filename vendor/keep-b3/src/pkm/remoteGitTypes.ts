import { Note, Folder } from '../types';
import { PortableVaultData, PortableFileEntry, GitCommitInfo } from './portableVaultTypes';

export type GitProvider = 'github' | 'gitlab' | 'gitea' | 'custom_http';

export type SyncState =
  | 'unconfigured'
  | 'idle'
  | 'clean'
  | 'checking'
  | 'synced'
  | 'local_ahead'
  | 'remote_ahead'
  | 'local_changes'
  | 'remote_changes'
  | 'diverged'
  | 'syncing'
  | 'syncing_pull'
  | 'syncing_push'
  | 'conflict'
  | 'auth_required'
  | 'error'
  | 'offline';

export type CredentialStorageMode = 'session_memory' | 'encrypted_vault' | 'none';

export interface RemoteRepoConfig {
  provider: GitProvider;
  owner: string; // or org/group (e.g. "octocat")
  repo: string; // repo name (e.g. "my-vault")
  branch: string; // default "main"
  baseUrl?: string; // for self-hosted GitLab/Gitea (e.g. "https://gitlab.example.com")
  corsProxyUrl?: string; // for custom_http adapter if user explicitly sets one
  authorName?: string;
  authorEmail?: string;
  syncMode?: 'plaintext' | 'encrypted_container'; // Explicit distinction: A. Plaintext portable Git repository vs B. Encrypted remote backup
  allowDecryptedPlaintextPush?: boolean; // User explicit confirmation before pushing decrypted markdown from an encrypted vault
  autoSyncIntervalMinutes?: number; // 0 = disabled, e.g. 5, 15, 30
  credentialStorageMode?: CredentialStorageMode;
}

export interface SyncStatusDetails {
  state: SyncState;
  isConfigured: boolean;
  isAuthenticated: boolean;
  lastSyncedAt?: string;
  lastCheckedAt?: string;
  lastSyncedCommitSha?: string;
  remoteHeadCommit?: RemoteCommitRef;
  unpushedChangesCount: number;
  unresolvedConflictsCount: number;
  message: string;
  error?: string;
}

export interface RemoteCredentials {
  token: string; // Personal Access Token (PAT) or OAuth token
  expiresAt?: string;
  rememberInSession?: boolean; // In-memory session only
}

export interface RemoteFileSnapshot {
  path: string;
  content: string | Uint8Array;
  isBinary: boolean;
  sha?: string;
}

export interface RemoteCommitRef {
  sha: string;
  shortSha: string;
  message: string;
  author: {
    name: string;
    email: string;
    date: string;
  };
  treeSha?: string;
}

export interface FileConflict {
  path: string;
  fileType: 'markdown' | 'json' | 'binary';
  baseContent?: string | Uint8Array;
  localContent: string | Uint8Array;
  remoteContent: string | Uint8Array;
  mergedContent?: string; // Auto-generated with conflict markers
  status: 'unresolved' | 'resolved';
  resolution?: 'local' | 'remote' | 'both' | 'custom';
  customContent?: string | Uint8Array;
  noteId?: string;
  noteTitle?: string;
}

export interface SyncResult {
  success: boolean;
  state: SyncState;
  pulledCount: number;
  pushedCount: number;
  conflicts: FileConflict[];
  remoteCommit?: RemoteCommitRef;
  message: string;
  error?: string;
}

export interface Merge3Result {
  clean: boolean;
  mergedText: string;
  hasConflicts: boolean;
  conflictBlocksCount: number;
}

export interface ProviderCapability {
  provider: GitProvider;
  name: string;
  directBrowserCORS: boolean;
  authTypes: ('pat' | 'oauth_token' | 'bearer')[];
  supportsDirectCommits: boolean;
  requiresCorsProxy: boolean;
  recommendedWorkflow: string;
  testedStatus: 'tested' | 'supported' | 'unsupported_without_proxy';
  notes: string;
}
