/**
 * Phase P32: Peer-to-Peer Device Sync Protocol & Architecture Types
 * Protocol Version: pkm-sync/1
 */

import { Note, Folder, SavedSearch, AppSettings } from '../../types';
import { CanvasBoard } from '../canvasTypes';
import { PDFAnnotation } from '../pdfTypes';
import { FileConflict } from '../remoteGitTypes';

export const P2P_PROTOCOL_VERSION = 'pkm-sync/1';
export const P2P_DEFAULT_CHUNK_SIZE = 64 * 1024; // 64 KB chunks for robust WebRTC transport
export const P2P_BUFFER_HIGH_WATERMARK = 256 * 1024; // 256 KB pause sending threshold
export const P2P_BUFFER_LOW_WATERMARK = 64 * 1024; // 64 KB resume sending threshold
export const P2P_PAIRING_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

export type P2PResourceType = 'note' | 'folder' | 'canvas' | 'pdf' | 'savedSearch';

export type P2PConnectionRoute = 'direct-host' | 'direct-srflx' | 'relayed-turn' | 'local-simulated' | 'unknown';

export type P2PSessionState =
  | 'idle'
  | 'pairing'
  | 'connecting'
  | 'authenticating'
  | 'comparing'
  | 'transferring'
  | 'merging'
  | 'conflicts'
  | 'applying'
  | 'verifying'
  | 'complete'
  | 'failed'
  | 'cancelled';

/**
 * Metadata for a paired device
 */
export interface P2PDevice {
  id: string; // Unique random device ID
  name: string; // User-editable display name
  publicKeyFingerprint: string; // SHA-256 fingerprint of device public key
  pairedAt: string;
  lastSyncedAt?: string;
  trustStatus: 'trusted' | 'pending' | 'revoked';
  lastProtocolVersion?: string;
}

/**
 * QR Code and Pairing Payload
 */
export interface P2PPairingPayload {
  v: string; // Protocol version e.g. "pkm-sync/1"
  sid: string; // Session ID (high-entropy random string)
  pk: string; // Base64 encoded ephemeral ECDH public key (SPKI)
  token: string; // Short-lived pairing secret token
  exp: number; // Unix epoch millisecond expiration
  vid?: string; // Stable Vault ID / fingerprint
  name?: string; // Device display name hint
  relayHint?: string; // Optional signaling/relay rendezvous URL
  sdpOffer?: string; // Optional compact SDP offer for direct offline QR pairing
}

/**
 * Sync Manifest Entry representing canonical resource state
 */
export interface P2PManifestEntry {
  id: string;
  type: P2PResourceType;
  logicalVersion: number;
  contentHash: string; // SHA-256 of canonical text/binary content
  updatedAt: string;
  size?: number;
  title?: string;
}

/**
 * Tombstone recording a resource deletion to propagate cleanly across devices
 */
export interface P2PTombstoneEntry {
  id: string;
  type: P2PResourceType;
  deletedAt: string;
  logicalVersion: number;
  contentHash?: string;
}

/**
 * Compact Vault Manifest exchanged during handshake
 */
export interface P2PSyncManifest {
  protocolVersion: string;
  vaultId: string;
  vaultName?: string;
  generatedAt: string;
  logicalRevision: number;
  entries: P2PManifestEntry[];
  tombstones: P2PTombstoneEntry[];
  totalResourcesCount: number;
  approximateTotalBytes: number;
}

/**
 * Calculated difference between local and remote manifests
 */
export interface P2PDiffResult {
  toSend: P2PManifestEntry[];
  toReceive: P2PManifestEntry[];
  tombstonesToSend: P2PTombstoneEntry[];
  tombstonesToReceive: P2PTombstoneEntry[];
  conflicts: P2PManifestConflict[];
  identicalCount: number;
  totalChangesToApplyLocally: number;
  totalChangesToSendRemotely: number;
}

export interface P2PManifestConflict {
  resourceId: string;
  type: P2PResourceType;
  title?: string;
  localVersion: number;
  remoteVersion: number;
  localHash: string;
  remoteHash: string;
  localUpdatedAt: string;
  remoteUpdatedAt: string;
  conflictType: 'edit_edit' | 'delete_edit' | 'edit_delete';
}

/**
 * Transfer payload wrapper
 */
export interface P2PResourcePayload {
  id: string;
  type: P2PResourceType;
  logicalVersion: number;
  contentHash: string;
  updatedAt: string;
  data: {
    note?: Note;
    folder?: Folder;
    canvas?: CanvasBoard;
    pdf?: PDFAnnotation;
    savedSearch?: SavedSearch;
    binaryData?: string; // Base64 encoded for media/attachment
  };
}

/**
 * Discriminated Union for Typed P2P Protocol Messages
 */
export type P2PProtocolMessage =
  | {
      type: 'HELLO';
      version: string;
      deviceId: string;
      deviceName: string;
      vaultId: string;
      nonce: string;
    }
  | {
      type: 'AUTH';
      deviceId: string;
      tokenSignature: string;
      sasFingerprint: string;
      nonce: string;
    }
  | {
      type: 'AUTH_ACK';
      success: boolean;
      error?: string;
      sasFingerprint: string;
    }
  | {
      type: 'MANIFEST_OFFER';
      manifest: P2PSyncManifest;
    }
  | {
      type: 'MANIFEST_RESPONSE';
      manifest: P2PSyncManifest;
    }
  | {
      type: 'DIFF_PROPOSAL';
      diff: P2PDiffResult;
    }
  | {
      type: 'TRANSFER_BEGIN';
      resourceId: string;
      resourceType: P2PResourceType;
      totalChunks: number;
      totalBytes: number;
      contentHash: string;
    }
  | {
      type: 'CHUNK_DATA';
      resourceId: string;
      chunkIndex: number;
      totalChunks: number;
      dataBase64: string;
      chunkHash?: string;
    }
  | {
      type: 'RESOURCE_COMPLETE';
      resourceId: string;
      contentHash: string;
    }
  | {
      type: 'RESOURCE_ACK';
      resourceId: string;
      verified: boolean;
      error?: string;
    }
  | {
      type: 'RESOLVE_CONFLICTS';
      resolutions: Array<{
        resourceId: string;
        resolution: 'local' | 'remote' | 'both' | 'custom';
        customContent?: string;
      }>;
    }
  | {
      type: 'COMMIT_READY';
      stagedCount: number;
      checksum: string;
    }
  | {
      type: 'COMMIT_ACK';
      success: boolean;
      appliedCount: number;
      error?: string;
    }
  | {
      type: 'VERIFY_SUMMARY';
      resultingChecksum: string;
      finalResourceCount: number;
    }
  | {
      type: 'PING';
      timestamp: number;
    }
  | {
      type: 'PONG';
      timestamp: number;
    }
  | {
      type: 'CANCEL';
      reason: string;
    }
  | {
      type: 'ERROR';
      code: string;
      message: string;
    };

/**
 * Diagnostics and session metrics
 */
export interface P2PSyncStats {
  connectionRoute: P2PConnectionRoute;
  iceState: RTCIceConnectionState | 'disconnected';
  peerDeviceId?: string;
  peerDeviceName?: string;
  sasPhrase?: string; // Short Authentication String (e.g. "FOREST SUNSET 482")
  bytesSent: number;
  bytesReceived: number;
  transferSpeedBytesPerSec: number;
  resourcesSent: number;
  resourcesReceived: number;
  totalResourcesToSync: number;
  conflictsCount: number;
  startTime: number;
  durationMs: number;
}

export interface P2PSyncHistoryEntry {
  id: string;
  timestamp: string;
  peerId: string;
  peerName: string;
  direction: 'bidirectional' | 'inbound' | 'outbound';
  status: 'success' | 'failed' | 'cancelled';
  changesApplied: number;
  changesSent: number;
  conflictsResolved: number;
  bytesTransferred: number;
  durationMs: number;
  error?: string;
}

export interface P2PNetworkConfig {
  iceServers: RTCIceServer[];
  signalingUrl?: string;
  allowRelay: boolean;
  maxChunkSize: number;
}
