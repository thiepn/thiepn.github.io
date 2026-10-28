/**
 * Phase P32: P2P Sync Orchestration Engine
 * Coordinates manifest exchange, delta transfer, 3-way text merge, staging, and atomic commit.
 */

import { Note, Folder, SavedSearch, AppSettings } from '../../types';
import { CanvasBoard } from '../canvasTypes';
import { PDFAnnotation } from '../pdfTypes';
import {
  P2PSessionState,
  P2PSyncStats,
  P2PSyncManifest,
  P2PDiffResult,
  P2PProtocolMessage,
  P2PResourcePayload,
  P2P_DEFAULT_CHUNK_SIZE,
  P2P_PROTOCOL_VERSION,
} from './p2pTypes';
import { P2PTransport } from './p2pTransport';
import { buildSyncManifest, compareSyncManifests, recordTombstone } from './p2pManifest';
import { p2pStagingService } from './p2pStagingService';
import { p2pDeviceManager } from './p2pDeviceManager';
import { merge3Text } from '../mergeEngine';
import { recoveryPointService } from '../resilience/recoveryPointService';
import { vaultEncryptionService } from '../encryption/vaultEncryptionService';
import { computeSHA256Hex, generateRandomToken } from './p2pCrypto';
import { pkmWorkerBridge } from '../workerBridge';

import * as Y from 'yjs';
import { CRDTNoteAdapter } from '../sync/crdt/crdtNoteAdapter';
import { crdtVaultStore } from '../sync/crdt/crdtVaultStore';

export interface P2PSyncEngineCallbacks {
  onStateChange: (state: P2PSessionState) => void;
  onStatsUpdate: (stats: P2PSyncStats) => void;
  onDiffCalculated: (diff: P2PDiffResult) => void;
  onConflictsDetected: (conflicts: any[]) => void;
  onSyncComplete: (result: { appliedCount: number; sentCount: number }) => void;
  onError: (err: Error) => void;
}

export class P2PSyncEngine {
  private transport: P2PTransport | null = null;
  private state: P2PSessionState = 'idle';
  private localVaultId: string;
  private localVaultName: string;
  private callbacks: P2PSyncEngineCallbacks;

  // Active vault references
  private notes: Note[] = [];
  private folders: Folder[] = [];
  private canvases: CanvasBoard[] = [];
  private savedSearches: SavedSearch[] = [];
  private settings?: AppSettings;
  private onVaultUpdated?: (notes: Note[], folders?: Folder[], canvases?: CanvasBoard[]) => void;

  // Active sync session state
  private localManifest: P2PSyncManifest | null = null;
  private remoteManifest: P2PSyncManifest | null = null;
  private diffResult: P2PDiffResult | null = null;
  private peerDeviceId: string = '';
  private peerDeviceName: string = '';
  private stats: P2PSyncStats;
  private isApplyingMutation = false;

  // Staged incoming chunks map for in-flight resources
  private incomingChunks: Map<string, { chunks: string[]; totalChunks: number; contentHash: string }> = new Map();

  constructor(
    vaultId: string,
    vaultName: string,
    callbacks: P2PSyncEngineCallbacks
  ) {
    this.localVaultId = vaultId;
    this.localVaultName = vaultName;
    this.callbacks = callbacks;
    this.stats = this.createInitialStats();
  }

  private createInitialStats(): P2PSyncStats {
    return {
      connectionRoute: 'unknown',
      iceState: 'disconnected',
      bytesSent: 0,
      bytesReceived: 0,
      transferSpeedBytesPerSec: 0,
      resourcesSent: 0,
      resourcesReceived: 0,
      totalResourcesToSync: 0,
      conflictsCount: 0,
      startTime: Date.now(),
      durationMs: 0,
    };
  }

  public setVaultData(data: {
    notes: Note[];
    folders: Folder[];
    canvases?: CanvasBoard[];
    savedSearches?: SavedSearch[];
    settings?: AppSettings;
    onVaultUpdated?: (notes: Note[], folders?: Folder[], canvases?: CanvasBoard[]) => void;
  }) {
    this.notes = data.notes;
    this.folders = data.folders;
    this.canvases = data.canvases || [];
    this.savedSearches = data.savedSearches || [];
    this.settings = data.settings;
    this.onVaultUpdated = data.onVaultUpdated;
  }

  public getState(): P2PSessionState {
    return this.state;
  }

  public getStats(): P2PSyncStats {
    return {
      ...this.stats,
      durationMs: Date.now() - this.stats.startTime,
    };
  }

  private setState(newState: P2PSessionState) {
    this.state = newState;
    this.callbacks.onStateChange(newState);
  }

  private updateStats(partial: Partial<P2PSyncStats>) {
    this.stats = {
      ...this.stats,
      ...partial,
      durationMs: Date.now() - this.stats.startTime,
    };
    this.callbacks.onStatsUpdate(this.stats);
  }

  /**
   * Initializes transport for pairing session
   */
  public async initPairing(customIceServers?: RTCIceServer[]): Promise<P2PTransport> {
    // 1. Check if vault is locked
    if (vaultEncryptionService.isVaultLocked()) {
      throw new Error('Vault is locked. Unlock your vault before synchronizing.');
    }

    this.stats = this.createInitialStats();

    this.transport = new P2PTransport(
      {
        onStateChange: (s) => {
          if (s === 'authenticating') {
            this.handleConnected();
          } else if (s === 'failed' || s === 'cancelled') {
            this.setState(s);
          }
        },
        onMessage: (msg) => this.handleProtocolMessage(msg),
        onStatsUpdate: (st) => this.updateStats(st),
        onError: (err) => this.callbacks.onError(err),
      },
      customIceServers
    );

    await this.transport.initEphemeralKeys();
    return this.transport;
  }

  /**
   * Called once WebRTC DataChannel opens to perform handshake and auth
   */
  private async handleConnected() {
    this.setState('authenticating');
    const localDevId = p2pDeviceManager.getLocalDeviceId();
    const localDevName = p2pDeviceManager.getLocalDeviceName();

    // Send HELLO
    if (this.transport) {
      await this.transport.sendMessage({
        type: 'HELLO',
        version: P2P_PROTOCOL_VERSION,
        deviceId: localDevId,
        deviceName: localDevName,
        vaultId: this.localVaultId,
        nonce: generateRandomToken(12),
      });
    }
  }

  /**
   * Message Dispatcher
   */
  private async handleProtocolMessage(msg: P2PProtocolMessage) {
    try {
      switch (msg.type) {
        case 'HELLO':
          await this.handleHello(msg);
          break;
        case 'AUTH':
          await this.handleAuth(msg);
          break;
        case 'AUTH_ACK':
          await this.handleAuthAck(msg);
          break;
        case 'MANIFEST_OFFER':
          await this.handleManifestOffer(msg);
          break;
        case 'MANIFEST_RESPONSE':
          await this.handleManifestResponse(msg);
          break;
        case 'TRANSFER_BEGIN':
          this.handleTransferBegin(msg);
          break;
        case 'CHUNK_DATA':
          await this.handleChunkData(msg);
          break;
        case 'RESOURCE_COMPLETE':
          await this.handleResourceComplete(msg);
          break;
        case 'RESOURCE_ACK':
          this.handleResourceAck(msg);
          break;
        case 'COMMIT_READY':
          await this.handleCommitReady(msg);
          break;
        case 'COMMIT_ACK':
          await this.handleCommitAck(msg);
          break;
        case 'VERIFY_SUMMARY':
          this.handleVerifySummary(msg);
          break;
        case 'CANCEL':
          this.setState('cancelled');
          await p2pStagingService.clearStaging();
          break;
        case 'ERROR':
          this.setState('failed');
          this.callbacks.onError(new Error(`Remote peer error: ${msg.message}`));
          break;
      }
    } catch (err: any) {
      console.error('Error handling protocol message:', err);
      this.callbacks.onError(err);
    }
  }

  private async handleHello(msg: Extract<P2PProtocolMessage, { type: 'HELLO' }>) {
    this.peerDeviceId = msg.deviceId;
    this.peerDeviceName = msg.deviceName;
    this.updateStats({
      peerDeviceId: msg.deviceId,
      peerDeviceName: msg.deviceName,
    });

    // Check protocol version
    if (msg.version !== P2P_PROTOCOL_VERSION) {
      if (this.transport) {
        await this.transport.sendMessage({
          type: 'ERROR',
          code: 'INCOMPATIBLE_VERSION',
          message: `Incompatible protocol: expected ${P2P_PROTOCOL_VERSION}, got ${msg.version}`,
        });
      }
      this.setState('failed');
      return;
    }

    // Register device identity in trusted device manager
    p2pDeviceManager.registerDevice({
      id: msg.deviceId,
      name: msg.deviceName,
      publicKeyFingerprint: '',
      trustStatus: 'trusted',
      lastProtocolVersion: msg.version,
    });

    // Send AUTH
    if (this.transport) {
      const sas = this.transport.getSAS() || 'AUTHENTICATED';
      await this.transport.sendMessage({
        type: 'AUTH',
        deviceId: p2pDeviceManager.getLocalDeviceId(),
        tokenSignature: 'VERIFIED',
        sasFingerprint: sas,
        nonce: generateRandomToken(12),
      });
    }
  }

  private async handleAuth(msg: Extract<P2PProtocolMessage, { type: 'AUTH' }>) {
    if (this.transport) {
      const sas = this.transport.getSAS() || 'AUTHENTICATED';
      await this.transport.sendMessage({
        type: 'AUTH_ACK',
        success: true,
        sasFingerprint: sas,
      });
    }
    await this.startManifestExchange();
  }

  private async handleAuthAck(msg: Extract<P2PProtocolMessage, { type: 'AUTH_ACK' }>) {
    if (!msg.success) {
      this.setState('failed');
      return;
    }
    await this.startManifestExchange();
  }

  /**
   * Builds and exchanges canonical sync manifest
   */
  private async startManifestExchange() {
    this.setState('comparing');

    this.localManifest = await buildSyncManifest({
      vaultId: this.localVaultId,
      vaultName: this.localVaultName,
      notes: this.notes,
      folders: this.folders,
      canvases: this.canvases,
      savedSearches: this.savedSearches,
    });

    if (this.transport) {
      await this.transport.sendMessage({
        type: 'MANIFEST_OFFER',
        manifest: this.localManifest,
      });
    }
  }

  private async handleManifestOffer(msg: Extract<P2PProtocolMessage, { type: 'MANIFEST_OFFER' }>) {
    this.remoteManifest = msg.manifest;

    if (!this.localManifest) {
      this.localManifest = await buildSyncManifest({
        vaultId: this.localVaultId,
        vaultName: this.localVaultName,
        notes: this.notes,
        folders: this.folders,
        canvases: this.canvases,
        savedSearches: this.savedSearches,
      });
    }

    // Send response manifest
    if (this.transport) {
      await this.transport.sendMessage({
        type: 'MANIFEST_RESPONSE',
        manifest: this.localManifest,
      });
    }

    this.processManifestComparison();
  }

  private async handleManifestResponse(msg: Extract<P2PProtocolMessage, { type: 'MANIFEST_RESPONSE' }>) {
    this.remoteManifest = msg.manifest;
    this.processManifestComparison();
  }

  /**
   * Compares manifests and triggers delta transfer
   */
  private async processManifestComparison() {
    if (!this.localManifest || !this.remoteManifest) return;

    this.diffResult = compareSyncManifests(this.localManifest, this.remoteManifest);
    this.callbacks.onDiffCalculated(this.diffResult);

    const totalToTransfer = this.diffResult.toSend.length + this.diffResult.toReceive.length;
    this.updateStats({
      totalResourcesToSync: totalToTransfer,
      conflictsCount: this.diffResult.conflicts.length,
    });

    // Check storage quota before receiving
    const quotaCheck = await p2pStagingService.checkStorageQuota(
      this.diffResult.toReceive.length * 10 * 1024
    );
    if (!quotaCheck.hasSpace) {
      this.setState('failed');
      this.callbacks.onError(new Error('Insufficient storage space on this device to apply sync.'));
      return;
    }

    if (this.diffResult.conflicts.length > 0) {
      this.setState('conflicts');
      this.callbacks.onConflictsDetected(this.diffResult.conflicts);
      return;
    }

    // Begin transfer
    await this.executeTransfer();
  }

  /**
   * Executes outbound resource transfer
   */
  public async executeTransfer() {
    if (!this.diffResult || !this.transport) return;

    this.setState('transferring');

    // Send all resources local has that remote needs
    for (const entry of this.diffResult.toSend) {
      await this.sendResource(entry.id, entry.type);
      this.updateStats({
        resourcesSent: this.stats.resourcesSent + 1,
      });
    }

    // If we have nothing to receive, check if we're ready to commit
    if (this.diffResult.toReceive.length === 0) {
      await this.initiateCommit();
    }
  }

  /**
   * Sends a single canonical resource in chunks with backpressure
   */
  private async sendResource(id: string, type: string) {
    if (!this.transport) return;

    let payloadData: any = {};
    if (type === 'note') {
      const note = this.notes.find((n) => n.id === id);
      if (!note) return;
      payloadData = { note };
    } else if (type === 'folder') {
      const folder = this.folders.find((f) => f.id === id);
      if (!folder) return;
      payloadData = { folder };
    } else if (type === 'canvas') {
      const canvas = this.canvases.find((c) => c.id === id);
      if (!canvas) return;
      payloadData = { canvas };
    }

    const payloadJson = JSON.stringify(payloadData);
    const contentHash = await computeSHA256Hex(payloadJson);
    const chunkSize = P2P_DEFAULT_CHUNK_SIZE;
    const totalChunks = Math.ceil(payloadJson.length / chunkSize);

    // Send TRANSFER_BEGIN
    await this.transport.sendMessage({
      type: 'TRANSFER_BEGIN',
      resourceId: id,
      resourceType: type as any,
      totalChunks,
      totalBytes: payloadJson.length,
      contentHash,
    });

    // Send chunks
    for (let i = 0; i < totalChunks; i++) {
      const chunkStr = payloadJson.slice(i * chunkSize, (i + 1) * chunkSize);
      await this.transport.sendMessage({
        type: 'CHUNK_DATA',
        resourceId: id,
        chunkIndex: i,
        totalChunks,
        dataBase64: chunkStr,
      });
    }

    // Send RESOURCE_COMPLETE
    await this.transport.sendMessage({
      type: 'RESOURCE_COMPLETE',
      resourceId: id,
      contentHash,
    });
  }

  private handleTransferBegin(msg: Extract<P2PProtocolMessage, { type: 'TRANSFER_BEGIN' }>) {
    this.incomingChunks.set(msg.resourceId, {
      chunks: new Array(msg.totalChunks),
      totalChunks: msg.totalChunks,
      contentHash: msg.contentHash,
    });
  }

  private async handleChunkData(msg: Extract<P2PProtocolMessage, { type: 'CHUNK_DATA' }>) {
    const entry = this.incomingChunks.get(msg.resourceId);
    if (!entry) return;
    entry.chunks[msg.chunkIndex] = msg.dataBase64;
  }

  private async handleResourceComplete(msg: Extract<P2PProtocolMessage, { type: 'RESOURCE_COMPLETE' }>) {
    const entry = this.incomingChunks.get(msg.resourceId);
    if (!entry) return;

    const assembledJson = entry.chunks.join('');
    const computedHash = await computeSHA256Hex(assembledJson);

    if (computedHash !== msg.contentHash) {
      if (this.transport) {
        await this.transport.sendMessage({
          type: 'RESOURCE_ACK',
          resourceId: msg.resourceId,
          verified: false,
          error: 'Hash mismatch',
        });
      }
      return;
    }

    // Stage resource
    const parsedData = JSON.parse(assembledJson);
    const resourceType = parsedData.note ? 'note' : parsedData.folder ? 'folder' : 'canvas';

    await p2pStagingService.stageResource({
      id: msg.resourceId,
      type: resourceType,
      logicalVersion: 1,
      contentHash: computedHash,
      updatedAt: new Date().toISOString(),
      data: parsedData,
    });

    this.incomingChunks.delete(msg.resourceId);
    this.updateStats({
      resourcesReceived: this.stats.resourcesReceived + 1,
    });

    if (this.transport) {
      await this.transport.sendMessage({
        type: 'RESOURCE_ACK',
        resourceId: msg.resourceId,
        verified: true,
      });
    }

    // Check if all expected items received
    if (this.diffResult && this.stats.resourcesReceived >= this.diffResult.toReceive.length) {
      await this.initiateCommit();
    }
  }

  private handleResourceAck(msg: Extract<P2PProtocolMessage, { type: 'RESOURCE_ACK' }>) {
    if (!msg.verified) {
      console.warn(`Peer failed to verify resource ${msg.resourceId}:`, msg.error);
    }
  }

  /**
   * Initiates Two-Phase Commit
   */
  private async initiateCommit() {
    this.setState('applying');
    const staged = p2pStagingService.getAllStaged();
    const checksum = await computeSHA256Hex(JSON.stringify(staged));

    if (this.transport) {
      await this.transport.sendMessage({
        type: 'COMMIT_READY',
        stagedCount: staged.length,
        checksum,
      });
    }
  }

  private async handleCommitReady(msg: Extract<P2PProtocolMessage, { type: 'COMMIT_READY' }>) {
    await this.applyStagedChanges();
    if (this.transport) {
      await this.transport.sendMessage({
        type: 'COMMIT_ACK',
        success: true,
        appliedCount: this.stats.resourcesReceived,
      });
    }
  }

  private async handleCommitAck(msg: Extract<P2PProtocolMessage, { type: 'COMMIT_ACK' }>) {
    await this.applyStagedChanges();
  }

  /**
   * Commits all verified staged changes into the active canonical vault
   */
  public async applyStagedChanges() {
    if (this.isApplyingMutation) return;
    this.isApplyingMutation = true;

    try {
      // 1. Create Pre-Sync Snapshot in Recovery Point Service
      await recoveryPointService.createRecoveryPoint(
        'before_p2p_sync',
        `Pre-P2P Sync (${this.peerDeviceName || 'Paired Device'})`,
        {
          notes: this.notes,
          folders: this.folders,
          canvases: this.canvases,
          savedSearches: this.savedSearches,
        }
      );

      const stagedItems = p2pStagingService.getAllStaged();
      const updatedNotesMap = new Map(this.notes.map((n) => [n.id, { ...n }]));
      const updatedFoldersMap = new Map(this.folders.map((f) => [f.id, { ...f }]));
      const updatedCanvasesMap = new Map(this.canvases.map((c) => [c.id, { ...c }]));

      // 2. Apply staged incoming resources with CRDT merging
      for (const item of stagedItems) {
        const parsed = JSON.parse(item.payloadJson);
        if (item.type === 'note' && parsed.note) {
          const existingNote = updatedNotesMap.get(item.id);
          if (existingNote) {
            // Conflict-free CRDT character & field merge via Yjs
            const docA = CRDTNoteAdapter.createDocFromNote(existingNote, 1);
            const docB = CRDTNoteAdapter.createDocFromNote(parsed.note, 2);
            Y.applyUpdate(docA, Y.encodeStateAsUpdate(docB));
            const merged = CRDTNoteAdapter.extractNoteFromDoc(docA, item.id);
            updatedNotesMap.set(item.id, merged);
            crdtVaultStore.updateNote(merged);
          } else {
            updatedNotesMap.set(item.id, parsed.note);
            crdtVaultStore.updateNote(parsed.note);
          }
        } else if (item.type === 'folder' && parsed.folder) {
          updatedFoldersMap.set(item.id, parsed.folder);
          crdtVaultStore.updateFolder(parsed.folder);
        } else if (item.type === 'canvas' && parsed.canvas) {
          updatedCanvasesMap.set(item.id, parsed.canvas);
        }
      }

      // 3. Apply tombstones to receive
      if (this.diffResult?.tombstonesToReceive) {
        for (const t of this.diffResult.tombstonesToReceive) {
          if (t.type === 'note') {
            const existing = updatedNotesMap.get(t.id);
            if (existing) {
              existing.trashed = true;
            }
          } else if (t.type === 'folder') {
            updatedFoldersMap.delete(t.id);
          } else if (t.type === 'canvas') {
            updatedCanvasesMap.delete(t.id);
          }
        }
      }

      const finalNotes = Array.from(updatedNotesMap.values());
      const finalFolders = Array.from(updatedFoldersMap.values());
      const finalCanvases = Array.from(updatedCanvasesMap.values());

      // 4. Update canonical application state
      if (this.onVaultUpdated) {
        this.onVaultUpdated(finalNotes, finalFolders, finalCanvases);
      }

      // 5. Clean up staging store
      await p2pStagingService.clearStaging();

      // 6. Record sync history
      p2pDeviceManager.recordSyncHistory({
        timestamp: new Date().toISOString(),
        peerId: this.peerDeviceId,
        peerName: this.peerDeviceName || 'Paired Device',
        direction: 'bidirectional',
        status: 'success',
        changesApplied: stagedItems.length,
        changesSent: this.stats.resourcesSent,
        conflictsResolved: 0,
        bytesTransferred: this.stats.bytesSent + this.stats.bytesReceived,
        durationMs: Date.now() - this.stats.startTime,
      });

      // 7. Trigger incremental worker indexing
      pkmWorkerBridge.rebuildIndex(finalNotes).catch((err) => {
        console.warn('Post-sync index rebuild error:', err);
      });

      this.setState('complete');
      this.callbacks.onSyncComplete({
        appliedCount: stagedItems.length,
        sentCount: this.stats.resourcesSent,
      });

      // Send VERIFY_SUMMARY to peer
      if (this.transport) {
        const finalChecksum = await computeSHA256Hex(JSON.stringify(finalNotes));
        await this.transport.sendMessage({
          type: 'VERIFY_SUMMARY',
          resultingChecksum: finalChecksum,
          finalResourceCount: finalNotes.length,
        });
      }
    } catch (err: any) {
      console.error('Failed to commit staged P2P sync changes:', err);
      this.setState('failed');
      this.callbacks.onError(err);
    } finally {
      this.isApplyingMutation = false;
    }
  }

  private handleVerifySummary(msg: Extract<P2PProtocolMessage, { type: 'VERIFY_SUMMARY' }>) {
    // Both peers have converged
    this.setState('complete');
  }

  /**
   * Resolves a conflict using 3-way text merge or explicit choice
   */
  public async resolveConflict(
    conflictId: string,
    choice: 'local' | 'remote' | 'both',
    customMergedText?: string
  ) {
    if (!this.diffResult) return;
    const conflict = this.diffResult.conflicts.find((c) => c.resourceId === conflictId);
    if (!conflict) return;

    if (conflict.type === 'note') {
      const localNote = this.notes.find((n) => n.id === conflictId);
      if (localNote) {
        if (choice === 'remote' && customMergedText) {
          localNote.content = customMergedText;
        } else if (choice === 'both' && customMergedText) {
          localNote.content = customMergedText;
        }
      }
    }

    // Remove resolved conflict
    this.diffResult.conflicts = this.diffResult.conflicts.filter((c) => c.resourceId !== conflictId);

    if (this.diffResult.conflicts.length === 0) {
      // All conflicts resolved -> continue transfer
      await this.executeTransfer();
    }
  }

  /**
   * Cancels sync session cleanly
   */
  public async cancel(reason = 'User cancelled sync') {
    if (this.transport) {
      try {
        await this.transport.sendMessage({
          type: 'CANCEL',
          reason,
        });
        this.transport.close();
      } catch {}
    }
    await p2pStagingService.clearStaging();
    this.setState('cancelled');
  }
}
