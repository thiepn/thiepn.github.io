/**
 * PKM V2.5 — Cross-Device Sync & Offline Continuity Types
 *
 * Formal types for canonical envelopes, state machines, 3-way merge,
 * tombstones, attachments, devices, protocol negotiation, and conflict resolution.
 */

import { ResourceType, ResourceRef } from '../core/resource/resourceCore';

export type SyncStateV2 =
  | 'offline'      // Working locally, network unavailable or paused; changes saved locally
  | 'idle'         // Ready to sync, no active transfer
  | 'checking'     // Contacting remote, exchanging manifests
  | 'pulling'      // Fetching remote changes & metadata
  | 'reconciling'  // Performing 3-way merge and tombstone evaluation
  | 'conflict'     // Conflicts detected, awaiting user resolution in Conflict Center
  | 'applying'     // Atomically applying merged state via Recovery Journal
  | 'pushing'      // Uploading local changes & resolved states to remote
  | 'synced'       // Strictly verified: zero pending local, zero pending remote, checkpoint current
  | 'paused'       // Sync paused by user; local editing remains fully functional
  | 'error';       // Transport or network failure; local data remains completely safe

export type SyncErrorCodeV2 =
  | 'SYNC_TRANSPORT_UNAVAILABLE'
  | 'SYNC_AUTH_EXPIRED'
  | 'SYNC_PROTOCOL_INCOMPATIBLE'
  | 'SYNC_SCHEMA_INCOMPATIBLE'
  | 'SYNC_REMOTE_REWRITTEN'
  | 'SYNC_MERGE_CONFLICT'
  | 'SYNC_APPLY_FAILED'
  | 'SYNC_ATTACHMENT_HASH_MISMATCH'
  | 'SYNC_BASELINE_MISSING'
  | 'SYNC_STORAGE_FULL'
  | 'SYNC_DIR_DISCONNECTED'
  | 'SYNC_PERMISSION_DENIED';

export interface TombstoneEnvelopeV2 {
  resourceId: string;
  resourceType: ResourceType;
  deletedRevision: number;
  deletedAt: string; // ISO UTC Instant
  deletedByDeviceId?: string;
  reason?: string;
}

export interface SyncResourceEnvelope {
  resourceId: string;
  resourceType: ResourceType;
  revision: number;
  schemaVersion: number;
  modifiedAt: string; // ISO UTC Instant
  modifiedByDeviceId?: string;
  contentHash: string; // SHA-256
  deleted?: boolean;
  tombstone?: TombstoneEnvelopeV2;
  title: string;
  path?: string;
  body?: string;
  metadata?: Record<string, any>;
  relations?: Array<{ targetId: string; relationType: string }>;
}

export interface SyncCheckpointV2 {
  lastRemoteRevision: string;
  baseManifestHash: string;
  protocolVersion: number;
  schemaVersion: number;
  lastSyncedAt: string;
  lastSyncedDeviceId: string;
  appliedResourceCount: number;
}

export type DevicePlatformV2 = 'web' | 'pwa' | 'desktop_macos' | 'desktop_windows' | 'desktop_linux' | 'mobile_ios' | 'mobile_android';
export type DeviceStatusV2 = 'active' | 'retired' | 'stale';

export interface DeviceMetadataV2 {
  deviceId: string;
  deviceName: string;
  platform: DevicePlatformV2;
  appVersion: string;
  protocolVersion: number;
  firstSeenAt: string;
  lastSyncTimestamp: string;
  status: DeviceStatusV2;
  retiredAt?: string;
  isCurrentDevice: boolean;
}

export type MaterializationStateV2 =
  | 'available_offline' // Full binary content present locally on device
  | 'metadata_only'     // Resource reference known; binary content not yet downloaded
  | 'downloading'       // Currently streaming chunked binary to local storage
  | 'upload_pending'    // New binary added locally; pending upload to sync remote
  | 'unavailable'       // Content missing or evicted on device
  | 'error';            // Hash mismatch or download failure

export interface AttachmentEnvelopeV2 {
  attachmentId: string;
  filename: string;
  mimeType: string;
  byteSize: number;
  contentHash: string; // SHA-256
  createdAt: string;
  materializationState: MaterializationStateV2;
  localPath?: string;
  chunkCount?: number;
  downloadedChunks?: number;
  lastVerifiedAt?: string;
}

export type ConflictTypeV2 =
  | 'same_field_changed'
  | 'delete_vs_edit'
  | 'rename_vs_rename'
  | 'move_vs_move'
  | 'binary_conflict'
  | 'ordering_conflict'
  | 'schema_incompatibility';

export type ResolutionChoiceV2 =
  | 'keep_local'
  | 'keep_remote'
  | 'keep_both'
  | 'manual_merge'
  | 'restore_edit'
  | 'restore_as_copy'
  | 'keep_deleted';

export interface SyncConflictV2 {
  conflictId: string;
  resourceId: string;
  resourceType: ResourceType;
  domain: string;
  title: string;
  conflictType: ConflictTypeV2;
  baseEnvelope?: SyncResourceEnvelope;
  localEnvelope: SyncResourceEnvelope;
  remoteEnvelope: SyncResourceEnvelope;
  fieldDifferences?: string[];
  detectedAt: string;
  resolvedAt?: string;
  resolutionChoice?: ResolutionChoiceV2;
  resolvedEnvelope?: SyncResourceEnvelope;
}

export interface ProtocolHandshakeV2 {
  vaultId: string;
  protocolVersion: number;
  schemaVersion: number;
  encryptionMode: 'none' | 'authenticated_v1' | 'authenticated_v2';
  capabilities: string[];
  deviceId: string;
  deviceName: string;
}

export interface SyncManifestV2 {
  vaultId: string;
  protocolVersion: number;
  schemaVersion: number;
  manifestHash: string;
  generatedAt: string;
  resources: Record<string, { revision: number; contentHash: string; modifiedAt: string; deleted?: boolean }>;
  tombstones: Record<string, TombstoneEnvelopeV2>;
  attachments: Record<string, { contentHash: string; byteSize: number; mimeType: string }>;
}

export interface SyncReportV2 {
  operationId: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  resourcesCompared: number;
  resourcesTransferred: number;
  attachmentsTransferred: number;
  bytesTransferred: number;
  conflictsCount: number;
  tombstonesProcessed: number;
  status: 'success' | 'partial' | 'conflict' | 'error' | 'no_change';
  errorCode?: SyncErrorCodeV2;
  errorMessage?: string;
  transportName: string;
}

export interface SemanticContinueCheckpointV2 {
  checkpointId: string;
  deviceId: string;
  deviceName: string;
  contextId?: string;
  contextTitle?: string;
  activeResourceId?: string;
  activeResourceTitle?: string;
  activeResourceType?: ResourceType;
  reviewId?: string;
  routineRunId?: string;
  timestamp: string; // ISO UTC Instant
}
