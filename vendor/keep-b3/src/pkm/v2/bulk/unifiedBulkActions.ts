import { ResourceCore } from '../core/resource/resourceCore';
import { actionSystemV2 } from '../core/actions/actionSystem';
import { connectionIndexV2 } from '../core/connections/connectionIndex';

export type BulkSelectionScope = 'explicit' | 'visible' | 'all_matching';

export interface BulkSelectionState {
  scope: BulkSelectionScope;
  selectedIds: Set<string>;
  visibleIds: string[];
  totalMatchingCount: number;
  allMatchingSnapshotIds?: string[]; // Snapshot of IDs at confirmation time to prevent query drift
}

export interface BulkOperationResult {
  operation: string;
  totalTargeted: number;
  succeeded: number;
  failed: number;
  conflicted: number;
  errors: string[];
  undoActionId?: string;
}

export class UnifiedBulkActionManager {
  /**
   * Snapshot IDs at confirmation time to guarantee deterministic execution without query drift.
   */
  public snapshotMatchingIds(matchingItems: ResourceCore[]): string[] {
    return matchingItems.map((item) => item.id);
  }

  public async executeBulkTag(
    resourceIds: string[],
    tagToAdd: string,
    resources: ResourceCore[],
    onUpdateResource: (res: ResourceCore) => void
  ): Promise<BulkOperationResult> {
    const cleanTag = tagToAdd.replace(/^#/, '').trim();
    let succeeded = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const id of resourceIds) {
      const res = resources.find((r) => r.id === id);
      if (!res) {
        failed++;
        errors.push(`Resource ${id} not found in working set`);
        continue;
      }

      const existingTags = res.tags || [];
      if (!existingTags.includes(cleanTag)) {
        const updated: ResourceCore = {
          ...res,
          tags: [...existingTags, cleanTag],
          updatedAt: Date.now(),
        };
        onUpdateResource(updated);
      }
      succeeded++;
    }

    return {
      operation: `Bulk Tag (+#${cleanTag})`,
      totalTargeted: resourceIds.length,
      succeeded,
      failed,
      conflicted: 0,
      errors,
    };
  }

  public async executeBulkSetProperty(
    resourceIds: string[],
    propertyName: string,
    propertyValue: any,
    resources: ResourceCore[],
    onUpdateResource: (res: ResourceCore) => void
  ): Promise<BulkOperationResult> {
    let succeeded = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const id of resourceIds) {
      const res = resources.find((r) => r.id === id);
      if (!res) {
        failed++;
        continue;
      }

      const updated: ResourceCore = {
        ...res,
        metadata: {
          ...(res.metadata || {}),
          [propertyName]: propertyValue,
        },
        updatedAt: Date.now(),
      };

      // Also set top-level if it's standard (status, priority, dueDate)
      if (propertyName in updated) {
        (updated as any)[propertyName] = propertyValue;
      }

      onUpdateResource(updated);
      succeeded++;
    }

    return {
      operation: `Bulk Set ${propertyName} = ${String(propertyValue)}`,
      totalTargeted: resourceIds.length,
      succeeded,
      failed,
      conflicted: 0,
      errors,
    };
  }

  public async executeBulkArchive(
    resourceIds: string[],
    archive: boolean,
    resources: ResourceCore[],
    onUpdateResource: (res: ResourceCore) => void
  ): Promise<BulkOperationResult> {
    let succeeded = 0;
    for (const id of resourceIds) {
      const res = resources.find((r) => r.id === id);
      if (res) {
        onUpdateResource({
          ...res,
          archived: archive,
          updatedAt: Date.now(),
        });
        succeeded++;
      }
    }

    return {
      operation: archive ? 'Bulk Archive' : 'Bulk Unarchive',
      totalTargeted: resourceIds.length,
      succeeded,
      failed: resourceIds.length - succeeded,
      conflicted: 0,
      errors: [],
    };
  }

  public async executeBulkRelate(
    resourceIds: string[],
    targetResourceId: string,
    relationLabel: string,
    resources: ResourceCore[]
  ): Promise<BulkOperationResult> {
    const target = resources.find((r) => r.id === targetResourceId);
    if (!target) {
      return {
        operation: 'Bulk Add Relation',
        totalTargeted: resourceIds.length,
        succeeded: 0,
        failed: resourceIds.length,
        conflicted: 0,
        errors: [`Target resource ${targetResourceId} not found`],
      };
    }

    let succeeded = 0;
    for (const id of resourceIds) {
      const source = resources.find((r) => r.id === id);
      if (source) {
        connectionIndexV2.addRelation(
          source.id,
          source.type,
          target.id,
          target.type,
          relationLabel
        );
        succeeded++;
      }
    }

    return {
      operation: `Bulk Add Relation (${relationLabel})`,
      totalTargeted: resourceIds.length,
      succeeded,
      failed: resourceIds.length - succeeded,
      conflicted: 0,
      errors: [],
    };
  }
}

export const unifiedBulkActionManager = new UnifiedBulkActionManager();
