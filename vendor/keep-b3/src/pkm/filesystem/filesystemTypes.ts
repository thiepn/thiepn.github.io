/**
 * Phase P45: Native Filesystem Vault Bridge, External Editing & Live Folder Mirroring
 * Core Type Definitions
 */

import { Note, Folder } from '../../types';

export type FilesystemBridgeStatus =
  | 'Connected'
  | 'Syncing'
  | 'Up to Date'
  | 'Changes Pending'
  | 'External Changes'
  | 'Conflicts'
  | 'Permission Required'
  | 'Unavailable'
  | 'Disconnected'
  | 'Error';

export type FilesystemPermissionState =
  | 'granted'
  | 'prompt'
  | 'denied'
  | 'unsupported';

export type FilenamePolicy = 'follow_title' | 'stable_id';

export interface FilesystemBridgeSettings {
  autoSync: boolean;
  pollingIntervalMs: number; // e.g. 10000 ms (10s)
  debounceMs: number; // e.g. 1200 ms
  filenamePolicy: FilenamePolicy;
  mirrorAttachments: boolean;
  mirrorConfig: boolean; // Collections, Dashboards, References, Review
  allowPlaintextEncryptedMirror: boolean;
  maxPathLength: number; // default 240
}

export interface FilesystemBridgeConfig {
  id: string;
  vaultId: string;
  displayName: string;
  mode: 'mirror';
  layoutVersion: number;
  lastSyncTimestamp?: number;
  status: FilesystemBridgeStatus;
  statusMessage?: string;
  settings: FilesystemBridgeSettings;
  createdAt: number;
  updatedAt: number;
}

export type MirrorResourceType =
  | 'note'
  | 'attachment'
  | 'canvas'
  | 'collection'
  | 'reference'
  | 'review'
  | 'dashboard'
  | 'config';

export interface MirrorFileRecord {
  resourceId: string;
  resourceType: MirrorResourceType;
  path: string; // Relative POSIX path e.g. "Projects/Alpha.md"
  lastHash: string; // SHA-256 or deterministic checksum of last synced content
  mtime?: number;
  size?: number;
  canonicalTitle?: string;
  folderId?: string | null;
}

/**
 * Manifest stored at /.pkm-manifest.json in the connected folder
 * Strictly excludes machine secrets, device tokens, and temporary derived indexes
 */
export interface MirrorManifest {
  formatVersion: number; // 1
  generator: string; // "KeepNotes-PKM-P45"
  vaultId: string;
  generatedAt: string;
  resources: Record<string, MirrorFileRecord>; // resourceId -> record
  pathToResourceId: Record<string, string>; // path -> resourceId
}

export type ReconciliationActionType =
  | 'app_to_disk' // App note updated -> write to disk
  | 'disk_to_app' // External file updated -> import into app
  | 'rename_disk' // App note renamed/moved -> move disk file
  | 'rename_app' // Disk file moved/renamed -> update app folder/title
  | 'new_external_note' // New .md file on disk -> create note
  | 'new_external_attachment' // New media file on disk -> import attachment
  | 'conflict' // Both sides modified -> 3-way merge / conflict modal
  | 'deletion_app_to_disk' // App note trashed -> remove from mirror
  | 'deletion_disk_to_app' // External file deleted -> propose trash/restore
  | 'noop';

export interface ReconciliationItem {
  id: string; // unique item id
  resourceId: string;
  resourceType: MirrorResourceType;
  path: string;
  action: ReconciliationActionType;
  baseHash?: string;
  appHash?: string;
  diskHash?: string;
  appMtime?: string;
  diskMtime?: number;
  title: string;
  cleanMergedText?: string;
  diffSummary?: string;
  isHighRisk?: boolean;
}

export interface ReconciliationPlan {
  id: string;
  timestamp: number;
  items: ReconciliationItem[];
  stats: {
    appToDiskCount: number;
    diskToAppCount: number;
    renameCount: number;
    newExternalCount: number;
    conflictCount: number;
    deletionCount: number;
    totalChanges: number;
  };
  isMassChange: boolean; // >50 changes
  isMassDelete: boolean; // >20% or >10 deletions
  requiresSafetyReview: boolean;
}

export interface FilesystemConflict {
  id: string;
  resourceId: string;
  resourceType: MirrorResourceType;
  path: string;
  title: string;
  detectedAt: number;
  baseContent?: string;
  canonicalContent?: string;
  externalContent?: string;
  baseHash?: string;
  appHash?: string;
  diskHash?: string;
  conflictType: 'text' | 'binary' | 'deletion' | 'id_collision';
  resolution?: 'keep_app' | 'keep_external' | 'keep_both' | 'custom_merge';
}

export interface FilesystemSyncLog {
  id: string;
  timestamp: string;
  appToDisk: number;
  diskToApp: number;
  conflicts: number;
  errors: string[];
  durationMs: number;
}

export interface FilesystemDoctorCheckResult {
  id: string;
  category: 'permission' | 'manifest' | 'collisions' | 'orphans' | 'security';
  status: 'pass' | 'warning' | 'error';
  title: string;
  details: string;
  remedyAction?: string;
}
