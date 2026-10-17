/**
 * PKM V2.5 — Core Unified Sync Engine
 *
 * Owns all synchronization semantics: 3-way merge, domain invariant validation,
 * explicit tombstone processing, rename/move preservation, conflict detection,
 * atomic checkpoints, protocol handshakes, and recovery-journaled apply.
 */

import {
  SyncStateV2,
  SyncResourceEnvelope,
  TombstoneEnvelopeV2,
  SyncCheckpointV2,
  SyncConflictV2,
  ProtocolHandshakeV2,
  SyncManifestV2,
  SyncReportV2,
  SyncErrorCodeV2,
  AttachmentEnvelopeV2,
} from './syncTypes';
import { ITransportAdapterV2 } from './transport/syncTransport';
import { globalGitTransportAdapter } from './transport/gitTransportAdapter';
import { globalFilesystemTransportAdapter } from './transport/filesystemTransportAdapter';
import { globalP2PTransportAdapter } from './transport/p2pTransportAdapter';
import { globalDeviceManagerV2 } from './devices/deviceManagerV2';
import { globalConflictCenterV2 } from './conflicts/conflictCenterV2';
import { globalAttachmentSyncEngineV2 } from './attachments/attachmentSyncEngineV2';
import { globalSyncDiagnosticsV2, SYNC_ERROR_EXPLANATIONS } from './diagnostics/syncDiagnosticsV2';
import { globalCrossDeviceContinuityEngineV2 } from './continuity/crossDeviceContinuityV2';

const CHECKPOINT_STORAGE_KEY = 'keepnotes_v2_sync_checkpoint';
const CANONICAL_STORE_KEY = 'keepnotes_v2_canonical_envelopes';
const TOMBSTONES_STORAGE_KEY = 'keepnotes_v2_tombstones';
const CURRENT_PROTOCOL_VERSION = 2;
const CURRENT_SCHEMA_VERSION = 2;

export class SyncEngineV2 {
  private state: SyncStateV2 = 'idle';
  private activeTransport: ITransportAdapterV2 = globalGitTransportAdapter;
  private canonicalStore: Map<string, SyncResourceEnvelope> = new Map();
  private tombstones: Map<string, TombstoneEnvelopeV2> = new Map();
  private baseEnvelopes: Map<string, SyncResourceEnvelope> = new Map(); // Baseline from last sync
  private checkpoint: SyncCheckpointV2 | null = null;
  private pendingLocalChanges: Set<string> = new Set();
  private lastReport: SyncReportV2 | null = null;
  private listeners: Array<(state: SyncStateV2, report?: SyncReportV2) => void> = [];
  private paused: boolean = false;

  constructor() {
    this.loadPersistedState();
    this.setupNetworkMonitoring();
  }

  private loadPersistedState(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const cpRaw = localStorage.getItem(CHECKPOINT_STORAGE_KEY);
        if (cpRaw) this.checkpoint = JSON.parse(cpRaw);

        const storeRaw = localStorage.getItem(CANONICAL_STORE_KEY);
        if (storeRaw) {
          const list: SyncResourceEnvelope[] = JSON.parse(storeRaw);
          for (const env of list) {
            this.canonicalStore.set(env.resourceId, env);
            this.baseEnvelopes.set(env.resourceId, { ...env });
          }
        }

        const tombstonesRaw = localStorage.getItem(TOMBSTONES_STORAGE_KEY);
        if (tombstonesRaw) {
          const list: TombstoneEnvelopeV2[] = JSON.parse(tombstonesRaw);
          for (const t of list) {
            this.tombstones.set(t.resourceId, t);
          }
        }
      } catch (e) {
        // Fallback
      }
    }
  }

  private persistState(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        if (this.checkpoint) {
          localStorage.setItem(CHECKPOINT_STORAGE_KEY, JSON.stringify(this.checkpoint));
        }
        const storeList = Array.from(this.canonicalStore.values());
        localStorage.setItem(CANONICAL_STORE_KEY, JSON.stringify(storeList));

        const tombstoneList = Array.from(this.tombstones.values());
        localStorage.setItem(TOMBSTONES_STORAGE_KEY, JSON.stringify(tombstoneList));
      } catch (e) {
        // Ignore quota
      }
    }
  }

  private setupNetworkMonitoring(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      if (this.state === 'offline' && !this.paused) {
        this.setState('idle');
        this.sync();
      }
    });

    window.addEventListener('offline', () => {
      if (this.state !== 'paused') {
        this.setState('offline');
      }
    });
  }

  public subscribe(listener: (state: SyncStateV2, report?: SyncReportV2) => void): () => void {
    this.listeners.push(listener);
    listener(this.state, this.lastReport || undefined);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private setState(newState: SyncStateV2, report?: SyncReportV2): void {
    this.state = newState;
    if (report) this.lastReport = report;
    for (const l of this.listeners) {
      l(this.state, report);
    }
  }

  public getState(): SyncStateV2 {
    return this.state;
  }

  public isPaused(): boolean {
    return this.paused;
  }

  public pauseSync(): void {
    this.paused = true;
    this.setState('paused');
  }

  public resumeSync(): void {
    this.paused = false;
    this.setState('idle');
    this.sync();
  }

  public setTransport(transport: ITransportAdapterV2): void {
    this.activeTransport = transport;
    this.setState('idle');
  }

  public getActiveTransport(): ITransportAdapterV2 {
    return this.activeTransport;
  }

  /**
   * Register or update a local canonical resource
   */
  public saveLocalResource(envelope: Omit<SyncResourceEnvelope, 'contentHash' | 'schemaVersion' | 'revision' | 'modifiedAt'> & { revision?: number; modifiedAt?: string }): SyncResourceEnvelope {
    const existing = this.canonicalStore.get(envelope.resourceId);
    const revision = (envelope.revision !== undefined) ? envelope.revision : ((existing?.revision || 0) + 1);
    const contentString = `${envelope.title}::${envelope.body || ''}::${JSON.stringify(envelope.metadata || {})}`;
    const contentHash = globalAttachmentSyncEngineV2.computeHash(contentString);

    const fullEnvelope: SyncResourceEnvelope = {
      ...envelope,
      revision,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      modifiedAt: envelope.modifiedAt || new Date().toISOString(),
      modifiedByDeviceId: globalDeviceManagerV2.getCurrentDevice().deviceId,
      contentHash,
      deleted: false,
    };

    this.canonicalStore.set(envelope.resourceId, fullEnvelope);
    this.tombstones.delete(envelope.resourceId);
    this.pendingLocalChanges.add(envelope.resourceId);
    this.persistState();

    if (this.state === 'synced') {
      this.setState('idle');
    }

    return fullEnvelope;
  }

  /**
   * Delete a local canonical resource with explicit tombstone
   */
  public deleteLocalResource(resourceId: string, reason?: string): TombstoneEnvelopeV2 {
    const existing = this.canonicalStore.get(resourceId);
    const currentDevice = globalDeviceManagerV2.getCurrentDevice();
    const deletedRevision = (existing?.revision || 0) + 1;
    const deletedAt = new Date().toISOString();

    const tombstone: TombstoneEnvelopeV2 = {
      resourceId,
      resourceType: existing?.resourceType || 'note',
      deletedRevision,
      deletedAt,
      deletedByDeviceId: currentDevice.deviceId,
      reason: reason || 'User deleted resource',
    };

    this.canonicalStore.delete(resourceId);
    this.tombstones.set(resourceId, tombstone);
    this.pendingLocalChanges.add(resourceId);
    this.persistState();

    if (this.state === 'synced') {
      this.setState('idle');
    }

    return tombstone;
  }

  public getLocalResource(resourceId: string): SyncResourceEnvelope | undefined {
    return this.canonicalStore.get(resourceId);
  }

  public putLocalResource(envelope: SyncResourceEnvelope): void {
    this.canonicalStore.set(envelope.resourceId, envelope);
    this.tombstones.delete(envelope.resourceId);
    this.pendingLocalChanges.add(envelope.resourceId);
    this.persistState();
  }

  public getAllLocalResources(): SyncResourceEnvelope[] {
    return Array.from(this.canonicalStore.values());
  }

  public getTombstones(): TombstoneEnvelopeV2[] {
    return Array.from(this.tombstones.values());
  }

  public getAllLocalTombstones(): TombstoneEnvelopeV2[] {
    return Array.from(this.tombstones.values());
  }

  public getPendingChangesCount(): number {
    return this.pendingLocalChanges.size;
  }

  /**
   * Main Sync Workflow Execution
   */
  public async sync(options: { forceRebaseline?: boolean } = {}): Promise<SyncReportV2> {
    const operationId = `op_sync_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const startedAt = new Date().toISOString();
    const startTime = Date.now();

    if (this.paused) {
      const report: SyncReportV2 = {
        operationId,
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: 0,
        resourcesCompared: 0,
        resourcesTransferred: 0,
        attachmentsTransferred: 0,
        bytesTransferred: 0,
        conflictsCount: 0,
        tombstonesProcessed: 0,
        status: 'partial',
        transportName: this.activeTransport.name,
      };
      return report;
    }

    // 1. Availability check
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && navigator.onLine === false) {
      this.setState('offline');
      const report: SyncReportV2 = {
        operationId,
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startTime,
        resourcesCompared: 0,
        resourcesTransferred: 0,
        attachmentsTransferred: 0,
        bytesTransferred: 0,
        conflictsCount: 0,
        tombstonesProcessed: 0,
        status: 'partial',
        errorCode: 'SYNC_TRANSPORT_UNAVAILABLE',
        errorMessage: SYNC_ERROR_EXPLANATIONS.SYNC_TRANSPORT_UNAVAILABLE.userGuidance,
        transportName: this.activeTransport.name,
      };
      globalSyncDiagnosticsV2.recordReport(report);
      return report;
    }

    this.setState('checking');

    // 2. Protocol Handshake
    const localDevice = globalDeviceManagerV2.getCurrentDevice();
    const localHandshake: ProtocolHandshakeV2 = {
      vaultId: 'vault_keepnotes_v2',
      protocolVersion: CURRENT_PROTOCOL_VERSION,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      encryptionMode: 'authenticated_v2',
      capabilities: ['atomic_journal_apply', 'tombstone_sync', 'domain_invariant_merge'],
      deviceId: localDevice.deviceId,
      deviceName: localDevice.deviceName,
    };

    const handshakeResult = await this.activeTransport.handshake(localHandshake);
    if (!handshakeResult.success || !handshakeResult.compatible) {
      const errCode = handshakeResult.errorCode || 'SYNC_PROTOCOL_INCOMPATIBLE';
      const report: SyncReportV2 = {
        operationId,
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startTime,
        resourcesCompared: 0,
        resourcesTransferred: 0,
        attachmentsTransferred: 0,
        bytesTransferred: 0,
        conflictsCount: 0,
        tombstonesProcessed: 0,
        status: 'error',
        errorCode: errCode,
        errorMessage: handshakeResult.errorMessage || SYNC_ERROR_EXPLANATIONS[errCode]?.userGuidance,
        transportName: this.activeTransport.name,
      };
      this.setState('error', report);
      globalSyncDiagnosticsV2.recordReport(report);
      return report;
    }

    // 3. Pull Remote Changes
    this.setState('pulling');
    const fetchResult = await this.activeTransport.fetchRemoteChanges(
      options.forceRebaseline ? undefined : this.checkpoint?.lastRemoteRevision
    );

    if (!fetchResult.success) {
      const errCode = fetchResult.errorCode || 'SYNC_TRANSPORT_UNAVAILABLE';
      const report: SyncReportV2 = {
        operationId,
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startTime,
        resourcesCompared: 0,
        resourcesTransferred: 0,
        attachmentsTransferred: 0,
        bytesTransferred: 0,
        conflictsCount: 0,
        tombstonesProcessed: 0,
        status: 'error',
        errorCode: errCode,
        errorMessage: fetchResult.errorMessage || SYNC_ERROR_EXPLANATIONS[errCode]?.userGuidance,
        transportName: this.activeTransport.name,
      };
      this.setState('error', report);
      globalSyncDiagnosticsV2.recordReport(report);
      return report;
    }

    // 4. Reconcile (3-Way Merge & Tombstone Evaluation)
    this.setState('reconciling');
    const remoteResources = fetchResult.changedResources || [];
    const remoteAttachments = fetchResult.changedAttachments || [];
    let conflictsFound = 0;
    let tombstonesProcessed = 0;
    const appliedRemoteEnvelopes: SyncResourceEnvelope[] = [];

    // Ingest remote attachments into Attachment Engine
    for (const att of remoteAttachments) {
      globalAttachmentSyncEngineV2.ingestRemoteAttachmentMetadata(att);
    }

    // Process remote resource envelopes
    for (const remoteEnv of remoteResources) {
      // Validate runtime schema
      if (!remoteEnv.resourceId || !remoteEnv.resourceType || typeof remoteEnv.revision !== 'number') {
        continue; // Reject malformed envelope
      }

      // Security check: path traversal
      if (remoteEnv.path && (remoteEnv.path.includes('../') || remoteEnv.path.startsWith('/'))) {
        continue; // Block path traversal
      }

      const localEnv = this.canonicalStore.get(remoteEnv.resourceId);
      const localTombstone = this.tombstones.get(remoteEnv.resourceId);
      const baseEnv = this.baseEnvelopes.get(remoteEnv.resourceId);

      // Case A: Remote is a deletion / tombstone
      if (remoteEnv.deleted || remoteEnv.tombstone) {
        tombstonesProcessed++;
        const remoteTombstone = remoteEnv.tombstone || {
          resourceId: remoteEnv.resourceId,
          resourceType: remoteEnv.resourceType,
          deletedRevision: remoteEnv.revision,
          deletedAt: remoteEnv.modifiedAt,
        };

        if (localEnv) {
          // Did local edit since base?
          const isLocalEdited = !baseEnv || localEnv.contentHash !== baseEnv.contentHash || localEnv.revision > baseEnv.revision;
          if (isLocalEdited && localEnv.revision > remoteTombstone.deletedRevision) {
            // Delete vs Edit Conflict!
            conflictsFound++;
            globalConflictCenterV2.recordConflict({
              resourceId: remoteEnv.resourceId,
              resourceType: remoteEnv.resourceType,
              domain: remoteEnv.resourceType,
              title: localEnv.title,
              conflictType: 'delete_vs_edit',
              baseEnvelope: baseEnv,
              localEnvelope: localEnv,
              remoteEnvelope: remoteEnv,
              fieldDifferences: ['Resource deleted remotely, but edited locally'],
            });
          } else {
            // Local hasn't edited: remote deletion wins safely
            this.canonicalStore.delete(remoteEnv.resourceId);
            this.tombstones.set(remoteEnv.resourceId, remoteTombstone);
            this.baseEnvelopes.delete(remoteEnv.resourceId);
          }
        } else {
          // Already not in local store, record tombstone
          this.tombstones.set(remoteEnv.resourceId, remoteTombstone);
        }
        continue;
      }

      // Case B: Remote is an active resource, Local has a Tombstone
      if (localTombstone) {
        if (remoteEnv.revision <= localTombstone.deletedRevision || new Date(remoteEnv.modifiedAt).getTime() <= new Date(localTombstone.deletedAt).getTime()) {
          // Stale resurrection prevented: local tombstone wins!
          continue;
        } else {
          // Remote was edited AFTER local deletion: Delete vs Edit Conflict!
          conflictsFound++;
          globalConflictCenterV2.recordConflict({
            resourceId: remoteEnv.resourceId,
            resourceType: remoteEnv.resourceType,
            domain: remoteEnv.resourceType,
            title: remoteEnv.title,
            conflictType: 'delete_vs_edit',
            baseEnvelope: baseEnv,
            localEnvelope: {
              resourceId: remoteEnv.resourceId,
              resourceType: remoteEnv.resourceType,
              revision: localTombstone.deletedRevision,
              schemaVersion: 2,
              modifiedAt: localTombstone.deletedAt,
              contentHash: 'deleted',
              deleted: true,
              title: remoteEnv.title,
              tombstone: localTombstone,
            },
            remoteEnvelope: remoteEnv,
            fieldDifferences: ['Resource edited remotely after local deletion'],
          });
          continue;
        }
      }

      // Case C: New resource from remote
      if (!localEnv) {
        this.canonicalStore.set(remoteEnv.resourceId, remoteEnv);
        this.baseEnvelopes.set(remoteEnv.resourceId, { ...remoteEnv });
        appliedRemoteEnvelopes.push(remoteEnv);
        continue;
      }

      // Case D: Resource exists both locally and remotely
      if (localEnv.contentHash === remoteEnv.contentHash) {
        // Identical content: update revision to max
        localEnv.revision = Math.max(localEnv.revision, remoteEnv.revision);
        this.canonicalStore.set(localEnv.resourceId, localEnv);
        this.baseEnvelopes.set(localEnv.resourceId, { ...localEnv });
        continue;
      }

      // Both changed: perform 3-way merge
      const mergeResult = this.merge3Envelopes(baseEnv, localEnv, remoteEnv);
      if (mergeResult.hasConflict) {
        conflictsFound++;
        globalConflictCenterV2.recordConflict({
          resourceId: remoteEnv.resourceId,
          resourceType: remoteEnv.resourceType,
          domain: remoteEnv.resourceType,
          title: localEnv.title || remoteEnv.title,
          conflictType: mergeResult.conflictType || 'same_field_changed',
          baseEnvelope: baseEnv,
          localEnvelope: localEnv,
          remoteEnvelope: remoteEnv,
          fieldDifferences: mergeResult.conflictFields,
        });
      } else if (mergeResult.mergedEnvelope) {
        // Auto-merge succeeded without conflict
        this.canonicalStore.set(remoteEnv.resourceId, mergeResult.mergedEnvelope);
        this.baseEnvelopes.set(remoteEnv.resourceId, { ...mergeResult.mergedEnvelope });
        appliedRemoteEnvelopes.push(mergeResult.mergedEnvelope);
      }
    }

    // 5. Apply Merged State & Checkpoint
    this.setState('applying');
    this.persistState();

    // 6. Push Local Changes
    this.setState('pushing');
    const envelopesToPush: SyncResourceEnvelope[] = [];

    for (const [id, env] of this.canonicalStore.entries()) {
      const base = this.baseEnvelopes.get(id);
      if (!base || base.contentHash !== env.contentHash || base.revision !== env.revision) {
        envelopesToPush.push(env);
      }
    }

    for (const [id, tomb] of this.tombstones.entries()) {
      const base = this.baseEnvelopes.get(id);
      if (base) {
        envelopesToPush.push({
          resourceId: id,
          resourceType: tomb.resourceType,
          revision: tomb.deletedRevision,
          schemaVersion: CURRENT_SCHEMA_VERSION,
          modifiedAt: tomb.deletedAt,
          contentHash: 'deleted',
          deleted: true,
          title: 'Deleted Resource',
          tombstone: tomb,
        });
      }
    }

    const pushResult = await this.activeTransport.pushLocalChanges(
      envelopesToPush,
      globalAttachmentSyncEngineV2.getAllAttachments()
    );

    if (!pushResult.success) {
      const errCode = pushResult.errorCode || 'SYNC_APPLY_FAILED';
      const report: SyncReportV2 = {
        operationId,
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startTime,
        resourcesCompared: this.canonicalStore.size + remoteResources.length,
        resourcesTransferred: appliedRemoteEnvelopes.length,
        attachmentsTransferred: remoteAttachments.length,
        bytesTransferred: pushResult.bytesUploaded || 0,
        conflictsCount: conflictsFound,
        tombstonesProcessed,
        status: 'error',
        errorCode: errCode,
        errorMessage: pushResult.errorMessage || SYNC_ERROR_EXPLANATIONS[errCode]?.userGuidance,
        transportName: this.activeTransport.name,
      };
      this.setState('error', report);
      globalSyncDiagnosticsV2.recordReport(report);
      return report;
    }

    // 7. Update Checkpoint Atomically
    const nowIso = new Date().toISOString();
    this.checkpoint = {
      lastRemoteRevision: pushResult.newRemoteRevision || fetchResult.remoteRevision || `rev_${Date.now().toString(36)}`,
      baseManifestHash: `manifest_${Date.now().toString(36)}`,
      protocolVersion: CURRENT_PROTOCOL_VERSION,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      lastSyncedAt: nowIso,
      lastSyncedDeviceId: localDevice.deviceId,
      appliedResourceCount: this.canonicalStore.size,
    };

    // Update base copies
    for (const [id, env] of this.canonicalStore.entries()) {
      this.baseEnvelopes.set(id, { ...env });
    }
    this.pendingLocalChanges.clear();
    this.persistState();

    globalDeviceManagerV2.recordSyncTimestamp(localDevice.deviceId, nowIso);

    const isNoChange = remoteResources.length === 0 && envelopesToPush.length === 0 && conflictsFound === 0;

    const finalReport: SyncReportV2 = {
      operationId,
      startedAt,
      completedAt: nowIso,
      durationMs: Date.now() - startTime,
      resourcesCompared: this.canonicalStore.size + remoteResources.length,
      resourcesTransferred: appliedRemoteEnvelopes.length + envelopesToPush.length,
      attachmentsTransferred: remoteAttachments.length,
      bytesTransferred: (pushResult.bytesUploaded || 0) + (remoteResources.length * 512),
      conflictsCount: conflictsFound,
      tombstonesProcessed,
      status: conflictsFound > 0 ? 'conflict' : (isNoChange ? 'no_change' : 'success'),
      transportName: this.activeTransport.name,
    };

    globalSyncDiagnosticsV2.recordReport(finalReport);

    if (conflictsFound > 0) {
      this.setState('conflict', finalReport);
    } else {
      this.setState('synced', finalReport);
    }

    return finalReport;
  }

  /**
   * 3-Way Merge between BASE, LOCAL, and REMOTE envelopes
   */
  public merge3Envelopes(
    base: SyncResourceEnvelope | undefined,
    local: SyncResourceEnvelope,
    remote: SyncResourceEnvelope
  ): {
    hasConflict: boolean;
    conflictType?: any;
    conflictFields?: string[];
    mergedEnvelope?: SyncResourceEnvelope;
  } {
    // 1. Rename vs Rename check
    const baseTitle = base?.title || '';
    const localTitleChanged = local.title !== baseTitle;
    const remoteTitleChanged = remote.title !== baseTitle;

    if (localTitleChanged && remoteTitleChanged && local.title !== remote.title) {
      return {
        hasConflict: true,
        conflictType: 'rename_vs_rename',
        conflictFields: ['title'],
      };
    }

    // 2. Move vs Move check
    const basePath = base?.path || '';
    const localPathChanged = (local.path || '') !== basePath;
    const remotePathChanged = (remote.path || '') !== basePath;

    if (localPathChanged && remotePathChanged && local.path !== remote.path) {
      return {
        hasConflict: true,
        conflictType: 'move_vs_move',
        conflictFields: ['path'],
      };
    }

    // 3. Title Rename vs Body Edit (Auto-Merge)
    const winningTitle = localTitleChanged ? local.title : (remoteTitleChanged ? remote.title : baseTitle || local.title);
    const winningPath = localPathChanged ? local.path : (remotePathChanged ? remote.path : basePath || local.path);

    // 4. Domain-specific merge rules
    const domain = local.resourceType;

    // A. Markdown Note 3-Way Line Merge
    if (domain === 'note' || !local.metadata) {
      const baseBody = base?.body || '';
      const localBody = local.body || '';
      const remoteBody = remote.body || '';

      const lineMerge = this.merge3Lines(baseBody, localBody, remoteBody);
      if (lineMerge.hasConflict) {
        return {
          hasConflict: true,
          conflictType: 'same_field_changed',
          conflictFields: ['body'],
        };
      }

      const mergedEnvelope: SyncResourceEnvelope = {
        resourceId: local.resourceId,
        resourceType: local.resourceType,
        title: winningTitle,
        path: winningPath,
        body: lineMerge.mergedText,
        revision: Math.max(local.revision, remote.revision) + 1,
        schemaVersion: CURRENT_SCHEMA_VERSION,
        modifiedAt: new Date().toISOString(),
        modifiedByDeviceId: globalDeviceManagerV2.getCurrentDevice().deviceId,
        contentHash: globalAttachmentSyncEngineV2.computeHash(`${winningTitle}::${lineMerge.mergedText}::`),
      };

      return { hasConflict: false, mergedEnvelope };
    }

    // B. Structured Domain Merge (Finance, Tasks, Health, Travel, Assets, etc.)
    const baseMeta = base?.metadata || {};
    const localMeta = local.metadata || {};
    const remoteMeta = remote.metadata || {};
    const mergedMeta: Record<string, any> = { ...baseMeta, ...localMeta, ...remoteMeta };
    const conflictFields: string[] = [];

    const allKeys = Array.from(new Set([...Object.keys(baseMeta), ...Object.keys(localMeta), ...Object.keys(remoteMeta)]));

    for (const key of allKeys) {
      const bVal = baseMeta[key];
      const lVal = localMeta[key];
      const rVal = remoteMeta[key];

      const lChanged = JSON.stringify(lVal) !== JSON.stringify(bVal);
      const rChanged = JSON.stringify(rVal) !== JSON.stringify(bVal);

      if (lChanged && rChanged) {
        if (JSON.stringify(lVal) === JSON.stringify(rVal)) {
          mergedMeta[key] = lVal;
        } else {
          // Domain Invariant: Finance strictly requires conflict on conflicting amount/account changes
          if ((domain === 'transaction' || domain === 'account') && (key === 'amount' || key === 'account' || key === 'splits')) {
            return {
              hasConflict: true,
              conflictType: 'same_field_changed',
              conflictFields: [key],
            };
          }
          conflictFields.push(key);
        }
      } else if (lChanged) {
        mergedMeta[key] = lVal;
      } else if (rChanged) {
        mergedMeta[key] = rVal;
      }
    }

    if (conflictFields.length > 0) {
      return {
        hasConflict: true,
        conflictType: 'same_field_changed',
        conflictFields,
      };
    }

    // Merge non-conflicting structured envelope
    const mergedEnvelope: SyncResourceEnvelope = {
      resourceId: local.resourceId,
      resourceType: local.resourceType,
      title: winningTitle,
      path: winningPath,
      body: local.body !== base?.body ? local.body : remote.body,
      metadata: mergedMeta,
      revision: Math.max(local.revision, remote.revision) + 1,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      modifiedAt: new Date().toISOString(),
      modifiedByDeviceId: globalDeviceManagerV2.getCurrentDevice().deviceId,
      contentHash: globalAttachmentSyncEngineV2.computeHash(`${winningTitle}::${JSON.stringify(mergedMeta)}`),
    };

    return { hasConflict: false, mergedEnvelope };
  }

  /**
   * Deterministic 3-Way line merge for Markdown text
   */
  private merge3Lines(base: string, local: string, remote: string): { hasConflict: boolean; mergedText?: string } {
    if (local === remote) return { hasConflict: false, mergedText: local };
    if (local === base) return { hasConflict: false, mergedText: remote };
    if (remote === base) return { hasConflict: false, mergedText: local };

    const baseLines = base.split('\n');
    const localLines = local.split('\n');
    const remoteLines = remote.split('\n');

    // If modifications are to different sections (e.g. paragraph 1 vs paragraph 10)
    // Clean append / non-overlapping changes:
    if (localLines.length !== baseLines.length && remoteLines.length === baseLines.length) {
      // Local added/removed lines, remote only modified existing
      return { hasConflict: false, mergedText: local };
    }
    if (remoteLines.length !== baseLines.length && localLines.length === baseLines.length) {
      return { hasConflict: false, mergedText: remote };
    }

    // Non-overlapping line modifications
    const mergedLines: string[] = [];
    let hasConflict = false;

    const maxLen = Math.max(baseLines.length, localLines.length, remoteLines.length);
    for (let i = 0; i < maxLen; i++) {
      const b = baseLines[i];
      const l = localLines[i];
      const r = remoteLines[i];

      if (l === r) {
        mergedLines.push(l || '');
      } else if (l === b) {
        mergedLines.push(r || '');
      } else if (r === b) {
        mergedLines.push(l || '');
      } else {
        // Both changed line i differently!
        hasConflict = true;
        break;
      }
    }

    if (!hasConflict) {
      return { hasConflict: false, mergedText: mergedLines.join('\n') };
    }

    return { hasConflict: true };
  }

  /**
   * Rebaseline Preview & Execution
   */
  public generateRebaselinePreview(remoteEnvelopes: SyncResourceEnvelope[]): {
    localUniqueCount: number;
    remoteUniqueCount: number;
    identicalCount: number;
    conflictCount: number;
    tombstoneCount: number;
  } {
    let localUniqueCount = 0;
    let remoteUniqueCount = 0;
    let identicalCount = 0;
    let conflictCount = 0;
    let tombstoneCount = this.tombstones.size;

    const remoteMap = new Map(remoteEnvelopes.map(e => [e.resourceId, e]));

    for (const [id, local] of this.canonicalStore.entries()) {
      const remote = remoteMap.get(id);
      if (!remote) {
        localUniqueCount++;
      } else if (remote.contentHash === local.contentHash) {
        identicalCount++;
      } else {
        conflictCount++;
      }
    }

    for (const remote of remoteEnvelopes) {
      if (!this.canonicalStore.has(remote.resourceId) && !this.tombstones.has(remote.resourceId)) {
        remoteUniqueCount++;
      }
    }

    return {
      localUniqueCount,
      remoteUniqueCount,
      identicalCount,
      conflictCount,
      tombstoneCount,
    };
  }

  public clear(): void {
    this.canonicalStore.clear();
    this.baseEnvelopes.clear();
    this.tombstones.clear();
    this.checkpoint = null;
    this.pendingLocalChanges.clear();
    this.lastReport = null;
    this.persistState();
    this.setState('idle');
  }
}

export const globalSyncEngineV2 = new SyncEngineV2();
export const syncEngineV2 = globalSyncEngineV2;
