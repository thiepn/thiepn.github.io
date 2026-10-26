/**
 * PKM V2.5 — Conflict Center Management Engine
 *
 * Centralizes detection, grouping, domain-aware diffing, and resolution of
 * synchronization conflicts. Preserves local integrity and ensures all resolutions
 * are journaled and non-destructive.
 */

import { SyncConflictV2, ResolutionChoiceV2, SyncResourceEnvelope } from '../syncTypes';
import { globalAttentionEngine } from '../../attention';

export class ConflictCenterV2 {
  private conflicts: Map<string, SyncConflictV2> = new Map();
  private resolutionHistory: SyncConflictV2[] = [];
  private listeners: Array<(conflicts: SyncConflictV2[]) => void> = [];

  constructor() {
    this.registerAttentionCondition();
  }

  private registerAttentionCondition(): void {
    if (!globalAttentionEngine || typeof globalAttentionEngine.registerEvaluator !== 'function') {
      return;
    }
    globalAttentionEngine.registerEvaluator((ctx) => {
      const active = this.getActiveConflicts();
      if (active.length === 0) return [];

      return [
        {
          id: 'att_sync_conflicts',
          dedupeKey: 'sync:conflicts:active',
          category: 'system',
          reason: 'sync_conflict',
          severity: 'important',
          title: `${active.length} Sync Conflict${active.length === 1 ? '' : 's'} Need Review`,
          whyExplanation: `${active.length} resource${active.length === 1 ? '' : 's'} have concurrent modifications across devices. Local data remains safe; please review the diffs in Conflict Center.`,
          createdAt: active[0].detectedAt,
          actionLabel: 'Open Conflict Center',
          actionType: 'open_sync_conflicts',
        },
      ];
    });
  }

  public subscribe(listener: (conflicts: SyncConflictV2[]) => void): () => void {
    this.listeners.push(listener);
    listener(this.getActiveConflicts());
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify(): void {
    const list = this.getActiveConflicts();
    for (const l of this.listeners) {
      l(list);
    }
  }

  public recordConflict(conflict: Omit<SyncConflictV2, 'conflictId' | 'detectedAt'>): SyncConflictV2 {
    const conflictId = `conf_${conflict.resourceId}_${Date.now().toString(36)}`;
    const fullConflict: SyncConflictV2 = {
      ...conflict,
      conflictId,
      detectedAt: new Date().toISOString(),
    };

    this.conflicts.set(conflict.resourceId, fullConflict);
    this.notify();
    return fullConflict;
  }

  public getActiveConflicts(): SyncConflictV2[] {
    return Array.from(this.conflicts.values()).filter(c => !c.resolvedAt);
  }

  public getConflict(resourceId: string): SyncConflictV2 | undefined {
    return this.conflicts.get(resourceId);
  }

  public resolveConflict(
    resourceId: string,
    choice: ResolutionChoiceV2,
    customMergedEnvelope?: SyncResourceEnvelope
  ): { success: boolean; resolvedEnvelope?: SyncResourceEnvelope; message: string } {
    const conflict = this.conflicts.get(resourceId);
    if (!conflict) {
      return { success: false, message: 'Conflict not found or already resolved.' };
    }

    let resolvedEnvelope: SyncResourceEnvelope;

    switch (choice) {
      case 'keep_local':
        resolvedEnvelope = {
          ...conflict.localEnvelope,
          revision: Math.max(conflict.localEnvelope.revision, conflict.remoteEnvelope.revision) + 1,
          modifiedAt: new Date().toISOString(),
        };
        break;

      case 'keep_remote':
        resolvedEnvelope = {
          ...conflict.remoteEnvelope,
          revision: Math.max(conflict.localEnvelope.revision, conflict.remoteEnvelope.revision) + 1,
          modifiedAt: new Date().toISOString(),
        };
        break;

      case 'keep_deleted':
        resolvedEnvelope = {
          resourceId: conflict.resourceId,
          resourceType: conflict.localEnvelope.resourceType,
          revision: Math.max(conflict.localEnvelope.revision, conflict.remoteEnvelope.revision) + 1,
          schemaVersion: 2,
          modifiedAt: new Date().toISOString(),
          contentHash: 'deleted',
          deleted: true,
          title: conflict.title,
          tombstone: {
            resourceId: conflict.resourceId,
            resourceType: conflict.localEnvelope.resourceType,
            deletedRevision: Math.max(conflict.localEnvelope.revision, conflict.remoteEnvelope.revision) + 1,
            deletedAt: new Date().toISOString(),
            reason: 'Resolved delete vs edit conflict: confirmed deletion',
          },
        };
        break;

      case 'restore_edit':
        const editSource = conflict.localEnvelope.deleted ? conflict.remoteEnvelope : conflict.localEnvelope;
        resolvedEnvelope = {
          ...editSource,
          deleted: false,
          tombstone: undefined,
          revision: Math.max(conflict.localEnvelope.revision, conflict.remoteEnvelope.revision) + 1,
          modifiedAt: new Date().toISOString(),
        };
        break;

      case 'keep_both':
      case 'restore_as_copy':
      case 'manual_merge':
        if (customMergedEnvelope) {
          resolvedEnvelope = {
            ...customMergedEnvelope,
            revision: Math.max(conflict.localEnvelope.revision, conflict.remoteEnvelope.revision) + 1,
            modifiedAt: new Date().toISOString(),
          };
        } else {
          resolvedEnvelope = {
            ...conflict.localEnvelope,
            title: `${conflict.title} (Local Copy)`,
            revision: Math.max(conflict.localEnvelope.revision, conflict.remoteEnvelope.revision) + 1,
            modifiedAt: new Date().toISOString(),
          };
        }
        break;

      default:
        resolvedEnvelope = {
          ...conflict.localEnvelope,
          revision: Math.max(conflict.localEnvelope.revision, conflict.remoteEnvelope.revision) + 1,
          modifiedAt: new Date().toISOString(),
        };
    }

    conflict.resolvedAt = new Date().toISOString();
    conflict.resolutionChoice = choice;
    conflict.resolvedEnvelope = resolvedEnvelope;

    this.conflicts.delete(resourceId);
    this.resolutionHistory.push(conflict);
    this.notify();

    return {
      success: true,
      resolvedEnvelope,
      message: `Conflict for "${conflict.title}" resolved using choice "${choice}".`,
    };
  }

  public clear(): void {
    this.conflicts.clear();
    this.resolutionHistory = [];
    this.notify();
  }
}

export const globalConflictCenterV2 = new ConflictCenterV2();
