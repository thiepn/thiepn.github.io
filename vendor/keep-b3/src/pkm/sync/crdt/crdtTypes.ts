/**
 * KEEP Differential CRDT Sync & P2P Synchronization Layer
 * Protocol Specification: keep-crdt-sync/v1
 */

import { Note, Folder, SavedSearch, AppSettings } from '../../../types';
import { CanvasBoard } from '../../canvasTypes';

export const CRDT_PROTOCOL_VERSION = 'keep-crdt-sync/v1';
export const CRDT_DEFAULT_CHUNK_SIZE = 64 * 1024; // 64 KB binary chunks
export const CRDT_MAX_BATCH_BYTES = 512 * 1024; // 512 KB delta batching threshold
export const CRDT_PERSIST_DEBOUNCE_MS = 250; // Throttled persistence

export type CRDTSyncStatus =
  | 'offline'
  | 'local_only'
  | 'connecting'
  | 'syncing'
  | 'up_to_date'
  | 'attention_required';

export type CRDTEntityType = 'note' | 'folder' | 'canvas' | 'savedSearch';

/**
 * State Vector summary entry for differential exchange
 */
export interface CRDTEntityVectorEntry {
  id: string;
  type: CRDTEntityType;
  stateVectorBase64: string; // Y.encodeStateVector as Base64
  updatedAt: string;
  title?: string;
  deleted?: boolean;
}

/**
 * Global State Vector Manifest exchanged between peers during handshake
 */
export interface CRDTSyncManifest {
  version: string;
  vaultId: string;
  deviceId: string;
  timestamp: string;
  entities: Record<string, CRDTEntityVectorEntry>;
  tombstones: Record<string, CRDTTombstone>;
  attachmentHashes: string[];
}

/**
 * Synchronized Tombstone for durable conflict-free deletion propagation
 */
export interface CRDTTombstone {
  id: string;
  type: CRDTEntityType;
  deletedAt: string;
  originDeviceId: string;
  logicalVersion: number;
  lastKnownTitle?: string;
}

/**
 * Incremental CRDT delta update item
 */
export interface CRDTDeltaItem {
  id: string;
  type: CRDTEntityType;
  updateBase64: string; // Y.encodeStateAsUpdate output
  updatedAt: string;
  isSnapshot?: boolean;
}

/**
 * Attachment Metadata Manifest Item
 */
export interface CRDTAttachmentItem {
  hash: string; // SHA-256 hex
  size: number; // bytes
  mimeType: string;
  filename: string;
  noteId?: string;
  createdAt: string;
}

/**
 * Discriminated Union for Typed CRDT Sync Protocol Messages
 */
export type CRDTProtocolMessage =
  | {
      type: 'CRDT_HELLO';
      version: string;
      deviceId: string;
      deviceName: string;
      vaultId: string;
      nonce: string;
    }
  | {
      type: 'CRDT_AUTH';
      deviceId: string;
      tokenSignature: string;
      sasFingerprint: string;
      nonce: string;
    }
  | {
      type: 'CRDT_AUTH_ACK';
      success: boolean;
      sasFingerprint: string;
      error?: string;
    }
  | {
      type: 'CRDT_MANIFEST_OFFER';
      manifest: CRDTSyncManifest;
    }
  | {
      type: 'CRDT_MANIFEST_RESPONSE';
      manifest: CRDTSyncManifest;
    }
  | {
      type: 'CRDT_DELTA_BATCH';
      batchIndex: number;
      totalBatches: number;
      deltas: CRDTDeltaItem[];
    }
  | {
      type: 'CRDT_LIVE_UPDATE';
      id: string;
      entityType: CRDTEntityType;
      updateBase64: string;
      updatedAt: string;
    }
  | {
      type: 'CRDT_TOMBSTONES';
      tombstones: CRDTTombstone[];
    }
  | {
      type: 'CRDT_ATTACHMENT_MANIFEST';
      attachments: CRDTAttachmentItem[];
    }
  | {
      type: 'CRDT_ATTACHMENT_REQUEST';
      requestedHashes: string[];
    }
  | {
      type: 'CRDT_ATTACHMENT_BEGIN';
      hash: string;
      filename: string;
      mimeType: string;
      totalBytes: number;
      totalChunks: number;
    }
  | {
      type: 'CRDT_ATTACHMENT_CHUNK';
      hash: string;
      chunkIndex: number;
      totalChunks: number;
      dataBase64: string;
    }
  | {
      type: 'CRDT_ATTACHMENT_ACK';
      hash: string;
      success: boolean;
      error?: string;
    }
  | {
      type: 'CRDT_SYNC_PROGRESS';
      phase: 'manifest' | 'deltas' | 'attachments' | 'committing' | 'complete';
      itemsCompleted: number;
      totalItems: number;
      bytesTransferred: number;
    }
  | {
      type: 'CRDT_SYNC_COMPLETE';
      summary: {
        appliedDeltas: number;
        sentDeltas: number;
        appliedTombstones: number;
        attachmentsTransferred: number;
      };
    }
  | {
      type: 'CRDT_PING';
      timestamp: number;
    }
  | {
      type: 'CRDT_PONG';
      timestamp: number;
    }
  | {
      type: 'CRDT_ERROR';
      code: string;
      message: string;
    };

export interface CRDTSyncProgress {
  status: CRDTSyncStatus;
  progressPercent: number;
  itemsProcessed: number;
  totalItems: number;
  bytesSent: number;
  bytesReceived: number;
  activePeerName?: string;
  activePeerId?: string;
  lastSyncedAt?: string;
  errorMessage?: string;
}
