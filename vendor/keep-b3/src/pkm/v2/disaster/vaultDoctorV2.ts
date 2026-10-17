/**
 * PKM V2.6 — Vault Doctor V2 & Integrity Scanner
 *
 * Implements Quick Check & Full Streaming Integrity Scans across all canonical resources,
 * validating domain invariants, broken references, schemas, and providing deterministic repair previews.
 */

import {
  VaultDoctorReportV2,
  VaultDoctorIssueV2,
} from './backupTypesV2';
import { SyncResourceEnvelope } from '../sync/syncTypes';
import { syncEngineV2 } from '../sync/syncEngineV2';
import { quarantineStoreV2 } from './quarantineStoreV2';
import { resourceRegistryV2 } from '../core/resource/resourceRegistry';

export class VaultDoctorV2 {
  /**
   * Fast Invariant Audit (< 100ms on typical vaults)
   */
  public async runQuickCheck(resources?: SyncResourceEnvelope[]): Promise<VaultDoctorReportV2> {
    const startTime = Date.now();
    const list = resources || syncEngineV2.getAllLocalResources();
    const issues: VaultDoctorIssueV2[] = [];
    const seenIds = new Set<string>();

    for (const res of list) {
      // 1. Duplicate ID check
      if (seenIds.has(res.resourceId)) {
        issues.push({
          id: `dup_${res.resourceId}`,
          category: 'duplicate_id',
          severity: 'error',
          title: `Duplicate Resource ID: "${res.resourceId}"`,
          description: `Multiple resources share the exact same ID ${res.resourceId}.`,
          resourceId: res.resourceId,
          resourceType: res.resourceType,
          autoFixable: true,
          fixActionName: 'Generate Unique ID',
        });
      } else {
        seenIds.add(res.resourceId);
      }

      // 2. Schema check
      if (!res.resourceType || !res.resourceId) {
        issues.push({
          id: `schema_missing_id_${Math.random()}`,
          category: 'schema',
          severity: 'error',
          title: 'Resource Missing Primary Identifiers',
          description: 'A resource record lacks a valid resourceId or resourceType.',
          autoFixable: false,
        });
      }
    }

    const durationMs = Date.now() - startTime;
    return {
      scanType: 'quick',
      timestamp: new Date().toISOString(),
      durationMs,
      totalResourcesScanned: list.length,
      totalAttachmentsScanned: 0,
      issues,
      quarantinedCount: quarantineStoreV2.getAll().length,
      healthy: issues.length === 0,
    };
  }

  /**
   * Deep Streaming Full Integrity Scan
   */
  public async runFullIntegrityScan(
    resources?: SyncResourceEnvelope[],
    onProgress?: (progress: { processed: number; total: number }) => void
  ): Promise<VaultDoctorReportV2> {
    const startTime = Date.now();
    const list = resources || syncEngineV2.getAllLocalResources();
    const total = list.length;
    const issues: VaultDoctorIssueV2[] = [];
    const seenIds = new Set<string>();
    const resourceMap = new Map<string, SyncResourceEnvelope>();

    for (const r of list) {
      resourceMap.set(r.resourceId, r);
    }

    const CHUNK_SIZE = 250;
    for (let i = 0; i < total; i += CHUNK_SIZE) {
      const chunk = list.slice(i, i + CHUNK_SIZE);
      for (const res of chunk) {
        // 1. Duplicate IDs
        if (seenIds.has(res.resourceId)) {
          issues.push({
            id: `dup_${res.resourceId}`,
            category: 'duplicate_id',
            severity: 'error',
            title: `Duplicate Resource ID: "${res.resourceId}"`,
            description: `Multiple resources share the exact same ID ${res.resourceId}.`,
            resourceId: res.resourceId,
            resourceType: res.resourceType,
            autoFixable: true,
            fixActionName: 'Generate Unique ID',
          });
        } else {
          seenIds.add(res.resourceId);
        }

        // 2. Registered Resource Type check
        const typeDef = resourceRegistryV2.get(res.resourceType as any);
        if (!typeDef && !['note', 'folder', 'task'].includes(res.resourceType)) {
          issues.push({
            id: `type_unregistered_${res.resourceId}`,
            category: 'schema',
            severity: 'warning',
            title: `Unregistered Resource Type: "${res.resourceType}"`,
            description: `Resource ${res.resourceId} has type "${res.resourceType}" which is not declared in the resource registry.`,
            resourceId: res.resourceId,
            resourceType: res.resourceType,
            autoFixable: false,
          });
        }

        // 3. Domain Invariants
        this.checkDomainInvariants(res, issues);

        // 4. Broken Relations & Parent References
        if (res.metadata?.parentId && !resourceMap.has(res.metadata.parentId)) {
          issues.push({
            id: `broken_parent_${res.resourceId}`,
            category: 'relation',
            severity: 'warning',
            title: `Missing Parent Container`,
            description: `Resource "${res.resourceId}" references non-existent parent "${res.metadata.parentId}".`,
            resourceId: res.resourceId,
            resourceType: res.resourceType,
            autoFixable: true,
            fixActionName: 'Detach from Parent (Move to Root)',
          });
        }
      }

      if (onProgress) {
        onProgress({
          processed: Math.min(i + CHUNK_SIZE, total),
          total,
        });
      }

      // Small async yield to prevent UI lockup on huge vaults
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    const durationMs = Date.now() - startTime;
    return {
      scanType: 'full',
      timestamp: new Date().toISOString(),
      durationMs,
      totalResourcesScanned: total,
      totalAttachmentsScanned: 0,
      issues,
      quarantinedCount: quarantineStoreV2.getAll().length,
      healthy: issues.length === 0,
    };
  }

  private checkDomainInvariants(res: SyncResourceEnvelope, issues: VaultDoctorIssueV2[]) {
    const data = ((res.metadata || (res as any).data || {})) as any;

    if (res.resourceType === 'transaction') {
      if (typeof data.amount !== 'number' || isNaN(data.amount)) {
        issues.push({
          id: `domain_inv_trans_${res.resourceId}`,
          category: 'domain_invariant',
          severity: 'error',
          title: 'Invalid Transaction Amount',
          description: `Transaction "${data.description || res.title || res.resourceId}" has a non-numeric or missing amount.`,
          resourceId: res.resourceId,
          resourceType: res.resourceType,
          autoFixable: true,
          fixActionName: 'Set Default Amount (0.00)',
        });
      }
    } else if (res.resourceType === 'health_metric') {
      if (!data.metricType || typeof data.value !== 'number') {
        issues.push({
          id: `domain_inv_health_${res.resourceId}`,
          category: 'domain_invariant',
          severity: 'error',
          title: 'Malformed Health Metric',
          description: `Health metric ${res.resourceId} is missing a valid metric type or numeric measurement value.`,
          resourceId: res.resourceId,
          resourceType: res.resourceType,
          autoFixable: false,
        });
      }
    } else if (res.resourceType === 'task') {
      if (data.status && !['todo', 'in_progress', 'done', 'cancelled', 'blocked'].includes(data.status)) {
        issues.push({
          id: `domain_inv_task_${res.resourceId}`,
          category: 'domain_invariant',
          severity: 'warning',
          title: `Unknown Task Status: "${data.status}"`,
          description: `Task "${data.title || res.title || res.resourceId}" has an unrecognized status.`,
          resourceId: res.resourceId,
          resourceType: res.resourceType,
          autoFixable: true,
          fixActionName: 'Normalize Status to "todo"',
        });
      }
    }
  }

  /**
   * Applies deterministic repair for a fixable issue
   */
  public applyRepair(issue: VaultDoctorIssueV2): boolean {
    if (!issue.autoFixable || !issue.resourceId) return false;

    const res = syncEngineV2.getLocalResource(issue.resourceId);
    if (!res) return false;

    if (issue.category === 'relation' && res.metadata?.parentId) {
      res.metadata.parentId = undefined;
      syncEngineV2.putLocalResource(res);
      return true;
    }

    if (issue.category === 'domain_invariant' && res.resourceType === 'transaction') {
      if (!res.metadata) res.metadata = {};
      res.metadata.amount = 0;
      if ((res as any).data) (res as any).data.amount = 0;
      syncEngineV2.putLocalResource(res);
      return true;
    }

    if (issue.category === 'domain_invariant' && res.resourceType === 'task') {
      if (!res.metadata) res.metadata = {};
      res.metadata.status = 'todo';
      if ((res as any).data) (res as any).data.status = 'todo';
      syncEngineV2.putLocalResource(res);
      return true;
    }

    return false;
  }
}

export const vaultDoctorV2 = new VaultDoctorV2();
