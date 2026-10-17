/**
 * KEEP CRDT Sync Coordinator
 * Orchestrates multi-device differential state-vector synchronization,
 * conflict-free delta application, live editing broadcasts, and attachment streaming.
 */

import { Note, Folder } from '../../../types';
import { storageService } from '../../../services/storage';
import { p2pDeviceManager } from '../../p2p/p2pDeviceManager';
import { crdtVaultStore } from './crdtVaultStore';
import { crdtAttachmentService } from './crdtAttachmentService';
import { CRDTNoteAdapter } from './crdtNoteAdapter';
import {
  CRDTSyncStatus,
  CRDTSyncProgress,
  CRDTProtocolMessage,
  CRDTSyncManifest,
  CRDTDeltaItem,
  CRDTTombstone,
  CRDT_PROTOCOL_VERSION,
  CRDT_MAX_BATCH_BYTES,
} from './crdtTypes';

export type CRDTSyncEvent =
  | { type: 'status_change'; status: CRDTSyncStatus; progress: CRDTSyncProgress }
  | { type: 'note_updated'; note: Note }
  | { type: 'note_deleted'; noteId: string }
  | { type: 'sync_completed'; stats: { notesUpdated: number; foldersUpdated: number; bytesSent: number; bytesReceived: number } }
  | { type: 'error'; message: string };

export class CRDTSyncCoordinator {
  private status: CRDTSyncStatus = 'local_only';
  private progress: CRDTSyncProgress = {
    status: 'local_only',
    progressPercent: 0,
    itemsProcessed: 0,
    totalItems: 0,
    bytesSent: 0,
    bytesReceived: 0,
  };

  private eventListeners: Set<(event: CRDTSyncEvent) => void> = new Set();
  private sendChannelMessage: ((msg: CRDTProtocolMessage) => Promise<void>) | null = null;
  private activePeerId: string | null = null;
  private activePeerName: string | null = null;
  private currentVaultId: string = 'keep-default-vault';
  private syncInProgress: boolean = false;
  private isLiveSyncEnabled: boolean = true;

  constructor() {
    // Monitor online/offline status
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));
      if (!navigator.onLine) {
        this.status = 'offline';
      }
    }
  }

  public subscribe(listener: (event: CRDTSyncEvent) => void): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  public subscribeToRemoteUpdates(
    listener: (event: { type: 'note_upserted'; note: Note } | { type: 'note_deleted'; noteId: string }) => void
  ): () => void {
    return this.subscribe((event) => {
      if (event.type === 'note_updated') {
        listener({ type: 'note_upserted', note: event.note });
      } else if (event.type === 'note_deleted') {
        listener({ type: 'note_deleted', noteId: event.noteId });
      }
    });
  }

  private emit(event: CRDTSyncEvent) {
    if (event.type === 'status_change') {
      this.status = event.status;
      this.progress = event.progress;
    }
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (err) {
        console.warn('Error in CRDTSync listener:', err);
      }
    }
  }

  public getStatus(): CRDTSyncStatus {
    return this.status;
  }

  public getProgress(): CRDTSyncProgress {
    return { ...this.progress };
  }

  public setVaultId(vaultId: string) {
    this.currentVaultId = vaultId;
  }

  private handleNetworkChange(online: boolean) {
    if (!online) {
      this.status = 'offline';
      this.emit({
        type: 'status_change',
        status: 'offline',
        progress: { ...this.progress, status: 'offline' },
      });
    } else {
      if (this.status === 'offline') {
        this.status = 'local_only';
        this.emit({
          type: 'status_change',
          status: 'local_only',
          progress: { ...this.progress, status: 'local_only' },
        });
      }
    }
  }

  /**
   * Called when local note is modified in the UI/editor
   */
  public async handleLocalNoteSaved(note: Note) {
    const { incrementalUpdate } = crdtVaultStore.updateNote(note);

    // If active P2P channel is connected, broadcast live incremental update
    if (this.isLiveSyncEnabled && this.sendChannelMessage && this.status === 'up_to_date') {
      if (incrementalUpdate.length > 2) {
        const updateBase64 = CRDTNoteAdapter.uint8ToBase64(incrementalUpdate);
        await this.sendChannelMessage({
          type: 'CRDT_LIVE_UPDATE',
          id: note.id,
          entityType: 'note',
          updateBase64,
          updatedAt: note.updatedAt,
        });
      }
    }
  }

  /**
   * Called when local note is deleted
   */
  public async handleLocalNoteDeleted(noteId: string, title?: string) {
    const localDeviceId = p2pDeviceManager.getLocalDeviceId();
    const tombstone = crdtVaultStore.recordTombstone(noteId, 'note', localDeviceId, title);

    if (this.isLiveSyncEnabled && this.sendChannelMessage && this.status === 'up_to_date') {
      await this.sendChannelMessage({
        type: 'CRDT_TOMBSTONES',
        tombstones: [tombstone],
      });
    }
  }

  /**
   * Binds transport message handler when P2P connection is established
   */
  public attachTransport(
    peerId: string,
    peerName: string,
    sendFn: (msg: CRDTProtocolMessage) => Promise<void>
  ) {
    this.activePeerId = peerId;
    this.activePeerName = peerName;
    this.sendChannelMessage = sendFn;
    this.status = 'connecting';
    this.progress = {
      status: 'connecting',
      progressPercent: 10,
      itemsProcessed: 0,
      totalItems: 100,
      bytesSent: 0,
      bytesReceived: 0,
      activePeerId: peerId,
      activePeerName: peerName,
    };
    this.emit({ type: 'status_change', status: 'connecting', progress: this.progress });
  }

  /**
   * Detaches transport when P2P peer disconnects
   */
  public detachTransport(peerId?: string) {
    if (peerId && this.activePeerId !== peerId) return;
    this.activePeerId = null;
    this.activePeerName = null;
    this.sendChannelMessage = null;
    this.syncInProgress = false;
    this.status = typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'local_only';
    this.progress = {
      status: this.status,
      progressPercent: 0,
      itemsProcessed: 0,
      totalItems: 0,
      bytesSent: 0,
      bytesReceived: 0,
    };
    this.emit({ type: 'status_change', status: this.status, progress: this.progress });
  }

  /**
   * Initiates the full 2-way differential CRDT synchronization cycle
   */
  public async initiateSync(): Promise<void> {
    if (!this.sendChannelMessage || this.syncInProgress) return;
    this.syncInProgress = true;

    try {
      this.status = 'syncing';
      this.progress = {
        ...this.progress,
        status: 'syncing',
        progressPercent: 20,
      };
      this.emit({ type: 'status_change', status: 'syncing', progress: this.progress });

      const localDeviceId = p2pDeviceManager.getLocalDeviceId();
      const manifest = await crdtVaultStore.getSyncManifest(this.currentVaultId, localDeviceId);

      await this.sendChannelMessage({
        type: 'CRDT_MANIFEST_OFFER',
        manifest,
      });
    } catch (err: any) {
      this.syncInProgress = false;
      this.status = 'attention_required';
      this.progress.errorMessage = err.message || 'Sync failed to initiate';
      this.emit({ type: 'status_change', status: 'attention_required', progress: this.progress });
      this.emit({ type: 'error', message: err.message || 'Sync failed' });
    }
  }

  /**
   * Processes an incoming CRDT protocol message from the peer
   */
  public async handleIncomingMessage(msg: CRDTProtocolMessage): Promise<void> {
    try {
      switch (msg.type) {
        case 'CRDT_HELLO': {
          const localDeviceId = p2pDeviceManager.getLocalDeviceId();
          const localDeviceName = p2pDeviceManager.getLocalDeviceName();
          if (this.sendChannelMessage) {
            await this.sendChannelMessage({
              type: 'CRDT_HELLO',
              version: CRDT_PROTOCOL_VERSION,
              deviceId: localDeviceId,
              deviceName: localDeviceName,
              vaultId: this.currentVaultId,
              nonce: Math.random().toString(36).slice(2),
            });
            // Automatically start differential sync
            await this.initiateSync();
          }
          break;
        }

        case 'CRDT_MANIFEST_OFFER': {
          // Peer offered their state vector manifest -> respond with our manifest and send our calculated deltas
          const localDeviceId = p2pDeviceManager.getLocalDeviceId();
          const localManifest = await crdtVaultStore.getSyncManifest(this.currentVaultId, localDeviceId);

          if (this.sendChannelMessage) {
            await this.sendChannelMessage({
              type: 'CRDT_MANIFEST_RESPONSE',
              manifest: localManifest,
            });

            // Calculate and send deltas that the peer is missing
            await this.sendDeltasForPeer(msg.manifest);
          }
          break;
        }

        case 'CRDT_MANIFEST_RESPONSE': {
          // Received peer's manifest response -> calculate and send deltas that the peer is missing
          await this.sendDeltasForPeer(msg.manifest);
          break;
        }

        case 'CRDT_DELTA_BATCH': {
          // Apply incoming CRDT deltas
          let updatedNotesCount = 0;
          let updatedFoldersCount = 0;

          for (const item of msg.deltas) {
            const bytes = CRDTNoteAdapter.base64ToUint8(item.updateBase64);
            const res = crdtVaultStore.applyRemoteDelta(item.id, item.type, bytes);

            if (res.mergedNote) {
              await storageService.saveNote(res.mergedNote);
              this.emit({ type: 'note_updated', note: res.mergedNote });
              updatedNotesCount++;
            } else if (res.mergedFolder) {
              await storageService.saveFolder(res.mergedFolder);
              updatedFoldersCount++;
            }
          }

          this.progress.itemsProcessed += msg.deltas.length;
          this.progress.progressPercent = Math.min(90, this.progress.progressPercent + 20);
          this.emit({ type: 'status_change', status: 'syncing', progress: this.progress });

          if (msg.batchIndex === msg.totalBatches - 1) {
            // All delta batches received -> check attachments
            await this.checkAndRequestAttachments();
          }
          break;
        }

        case 'CRDT_LIVE_UPDATE': {
          // Single real-time update during active editing session
          const bytes = CRDTNoteAdapter.base64ToUint8(msg.updateBase64);
          const res = crdtVaultStore.applyRemoteDelta(msg.id, msg.entityType, bytes);
          if (res.mergedNote) {
            await storageService.saveNote(res.mergedNote);
            this.emit({ type: 'note_updated', note: res.mergedNote });
          } else if (res.mergedFolder) {
            await storageService.saveFolder(res.mergedFolder);
          }
          break;
        }

        case 'CRDT_TOMBSTONES': {
          for (const tomb of msg.tombstones) {
            const applied = crdtVaultStore.applyRemoteTombstone(tomb);
            if (applied) {
              if (tomb.type === 'note') {
                await storageService.deleteNotePermanently(tomb.id);
                this.emit({ type: 'note_deleted', noteId: tomb.id });
              } else if (tomb.type === 'folder') {
                await storageService.deleteFolder(tomb.id);
              }
            }
          }
          break;
        }

        case 'CRDT_ATTACHMENT_REQUEST': {
          // Stream requested attachments back to peer
          for (const hash of msg.requestedHashes) {
            await this.streamAttachmentToPeer(hash);
          }
          break;
        }

        case 'CRDT_ATTACHMENT_BEGIN': {
          crdtAttachmentService.beginIncomingTransfer(
            msg.hash,
            msg.filename,
            msg.mimeType,
            msg.totalBytes,
            msg.totalChunks
          );
          break;
        }

        case 'CRDT_ATTACHMENT_CHUNK': {
          const res = await crdtAttachmentService.receiveChunk(
            msg.hash,
            msg.chunkIndex,
            msg.totalChunks,
            msg.dataBase64
          );
          if (res.complete && this.sendChannelMessage) {
            await this.sendChannelMessage({
              type: 'CRDT_ATTACHMENT_ACK',
              hash: msg.hash,
              success: true,
            });
          }
          break;
        }

        case 'CRDT_ATTACHMENT_ACK': {
          // Attachment successfully acknowledged by peer
          break;
        }

        case 'CRDT_SYNC_COMPLETE': {
          this.syncInProgress = false;
          this.status = 'up_to_date';
          this.progress = {
            ...this.progress,
            status: 'up_to_date',
            progressPercent: 100,
            lastSyncedAt: new Date().toISOString(),
          };
          if (this.activePeerId) {
            p2pDeviceManager.recordSyncHistory({
              timestamp: new Date().toISOString(),
              peerId: this.activePeerId,
              peerName: this.activePeerName || 'Peer Device',
              direction: 'bidirectional',
              status: 'success',
              changesApplied: msg.summary.appliedDeltas,
              changesSent: msg.summary.sentDeltas,
              conflictsResolved: 0,
              bytesTransferred: this.progress.bytesSent + this.progress.bytesReceived,
              durationMs: 0,
            });
          }
          this.emit({ type: 'status_change', status: 'up_to_date', progress: this.progress });
          this.emit({
            type: 'sync_completed',
            stats: {
              notesUpdated: msg.summary.appliedDeltas,
              foldersUpdated: 0,
              bytesSent: this.progress.bytesSent,
              bytesReceived: this.progress.bytesReceived,
            },
          });
          break;
        }

        case 'CRDT_ERROR': {
          console.error('Peer CRDT Error:', msg.code, msg.message);
          this.status = 'attention_required';
          this.progress.errorMessage = msg.message;
          this.emit({ type: 'status_change', status: 'attention_required', progress: this.progress });
          this.emit({ type: 'error', message: msg.message });
          break;
        }
      }
    } catch (err: any) {
      console.error('Error handling CRDT message:', err);
    }
  }

  /**
   * Calculates missing deltas and tombstones to send to peer in batches
   */
  private async sendDeltasForPeer(peerManifest: CRDTSyncManifest) {
    if (!this.sendChannelMessage) return;

    // 1. Send Tombstones
    const tombstonesToSend: CRDTTombstone[] = [];
    const localTombstones = crdtVaultStore.getAllTombstones();
    for (const t of localTombstones) {
      const peerTomb = peerManifest.tombstones[t.id];
      if (!peerTomb || new Date(t.deletedAt).getTime() > new Date(peerTomb.deletedAt).getTime()) {
        tombstonesToSend.push(t);
      }
    }

    if (tombstonesToSend.length > 0) {
      await this.sendChannelMessage({
        type: 'CRDT_TOMBSTONES',
        tombstones: tombstonesToSend,
      });
    }

    // 2. Compute Deltas
    const deltas = crdtVaultStore.computeDeltasToSend(peerManifest);

    if (deltas.length === 0) {
      // Nothing to send -> signal completion if peer has finished too
      await this.sendChannelMessage({
        type: 'CRDT_SYNC_COMPLETE',
        summary: {
          appliedDeltas: 0,
          sentDeltas: 0,
          appliedTombstones: tombstonesToSend.length,
          attachmentsTransferred: 0,
        },
      });
      return;
    }

    // Batch deltas to respect flow control
    const BATCH_SIZE = 15;
    const totalBatches = Math.ceil(deltas.length / BATCH_SIZE);

    for (let b = 0; b < totalBatches; b++) {
      const batchItems = deltas.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);
      await this.sendChannelMessage({
        type: 'CRDT_DELTA_BATCH',
        batchIndex: b,
        totalBatches,
        deltas: batchItems,
      });
    }

    // Complete notification
    await this.sendChannelMessage({
      type: 'CRDT_SYNC_COMPLETE',
      summary: {
        appliedDeltas: 0,
        sentDeltas: deltas.length,
        appliedTombstones: tombstonesToSend.length,
        attachmentsTransferred: 0,
      },
    });
  }

  /**
   * Checks if local vault is missing any attachment referenced in notes
   */
  private async checkAndRequestAttachments() {
    if (!this.sendChannelMessage) return;

    const init = await storageService.initialize();
    const allNotes = init.notes;
    const neededHashes = new Set<string>();

    for (const note of allNotes) {
      if (note.images && Array.isArray(note.images)) {
        for (const img of note.images) {
          if (img && typeof img === 'object' && img.id && img.id.length === 64) {
            neededHashes.add(img.id);
          } else if (typeof img === 'string' && (img as string).length === 64) {
            neededHashes.add(img);
          }
        }
      }
    }

    const missingHashes: string[] = [];
    for (const hash of neededHashes) {
      const exists = await crdtAttachmentService.hasAttachment(hash);
      if (!exists) {
        missingHashes.push(hash);
      }
    }

    if (missingHashes.length > 0) {
      await this.sendChannelMessage({
        type: 'CRDT_ATTACHMENT_REQUEST',
        requestedHashes: missingHashes,
      });
    }
  }

  /**
   * Streams a binary attachment to the peer in 64KB chunks
   */
  private async streamAttachmentToPeer(hash: string) {
    if (!this.sendChannelMessage) return;

    const chunkData = await crdtAttachmentService.createChunks(hash);
    if (!chunkData) return;

    await this.sendChannelMessage({
      type: 'CRDT_ATTACHMENT_BEGIN',
      hash,
      filename: chunkData.item.filename,
      mimeType: chunkData.item.mimeType,
      totalBytes: chunkData.item.size,
      totalChunks: chunkData.totalChunks,
    });

    for (let i = 0; i < chunkData.totalChunks; i++) {
      const ch = chunkData.getChunk(i);
      await this.sendChannelMessage({
        type: 'CRDT_ATTACHMENT_CHUNK',
        hash,
        chunkIndex: ch.index,
        totalChunks: chunkData.totalChunks,
        dataBase64: ch.dataBase64,
      });
    }
  }
}

export const crdtSyncCoordinator = new CRDTSyncCoordinator();
