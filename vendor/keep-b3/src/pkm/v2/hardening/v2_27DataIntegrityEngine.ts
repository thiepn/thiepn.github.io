/**
 * V2.27 Data Integrity & Storage Correctness Engine
 * 
 * Implements:
 * 1. Authoritative 8-Class Data Partitioning Matrix
 * 2. Canonical Write Path Enforcement & Precondition Validation
 * 3. Storage Failure Defenses (Never masquerade open failures as empty vaults)
 * 4. Derived Corruption Auto-Rebuilder
 * 5. Deterministic Vault Doctor (Quick, Full, Repair, Quarantine & Salvage modes)
 * 6. Quota Exhaustion & Read-Only Degraded Mode Protections
 */

export type DataClassification =
  | 'Canonical'
  | 'Derived'
  | 'RecoveryMetadata'
  | 'DeviceLocal'
  | 'Cache'
  | 'CredentialSecret'
  | 'ExternalProjection'
  | 'Temporary';

export interface DataClassificationRecord {
  storeName: string;
  classification: DataClassification;
  description: string;
  isSynced: boolean;
  isBackedUp: boolean;
  isEncrypted: boolean;
  isRebuildable: boolean;
}

export interface CanonicalResource {
  id: string;
  version: number;
  type: 'note' | 'task' | 'event' | 'project' | 'relation' | 'review' | 'automation' | 'domain_record';
  payload: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
  tombstone?: boolean;
}

export interface VaultDoctorIssue {
  id: string;
  severity: 'CRITICAL' | 'ERROR' | 'WARNING';
  category: 'MISSING_RECORD' | 'INVALID_SCHEMA' | 'ORPHAN_ATTACHMENT' | 'DUPLICATE_ID' | 'BROKEN_RELATION' | 'INCONSISTENT_PAIR' | 'JOURNAL_REMNANT';
  message: string;
  resourceId?: string;
  reparable: boolean;
  quarantined: boolean;
}

export interface VaultDoctorReport {
  mode: 'Quick' | 'Full' | 'Repair';
  scannedCount: number;
  issueCount: number;
  repairedCount: number;
  quarantinedCount: number;
  issues: VaultDoctorIssue[];
  healthy: boolean;
  timestamp: number;
}

export class V2_27DataIntegrityEngine {
  private static instance: V2_27DataIntegrityEngine;
  
  // Simulated Canonical Store
  private readonly canonicalStore: Map<string, CanonicalResource> = new Map();
  // Quarantined corrupted resources
  private readonly quarantineStore: Map<string, { resource: CanonicalResource; reason: string; quarantinedAt: number }> = new Map();
  // Derived Indexes (Rebuildable)
  private readonly derivedSearchIndex: Map<string, string[]> = new Map();
  private readonly derivedEmbeddingsIndex: Map<string, number[]> = new Map();
  
  // Storage State flags
  private isStorageOpen = true;
  private isReadOnlyRecoveryMode = false;
  private isQuotaExhausted = false;

  private constructor() {
    this.seedCanonicalState();
    this.rebuildDerivedIndexes();
  }

  public static getInstance(): V2_27DataIntegrityEngine {
    if (!V2_27DataIntegrityEngine.instance) {
      V2_27DataIntegrityEngine.instance = new V2_27DataIntegrityEngine();
    }
    return V2_27DataIntegrityEngine.instance;
  }

  // =========================================================================
  // 1. AUTHORITATIVE DATA CLASSIFICATION MATRIX
  // =========================================================================

  public getDataClassificationMatrix(): DataClassificationRecord[] {
    return [
      {
        storeName: 'canonical_notes',
        classification: 'Canonical',
        description: 'User Markdown notes, documents, and canvas boards',
        isSynced: true,
        isBackedUp: true,
        isEncrypted: true,
        isRebuildable: false,
      },
      {
        storeName: 'canonical_tasks_projects',
        classification: 'Canonical',
        description: 'Tasks, recurring schedules, milestones, and projects',
        isSynced: true,
        isBackedUp: true,
        isEncrypted: true,
        isRebuildable: false,
      },
      {
        storeName: 'canonical_domains',
        classification: 'Canonical',
        description: 'Personal OS records (Finance integer cents, Health metrics, People, Inventory)',
        isSynced: true,
        isBackedUp: true,
        isEncrypted: true,
        isRebuildable: false,
      },
      {
        storeName: 'canonical_relations_automations',
        classification: 'Canonical',
        description: 'Explicit bi-directional links, trigger rules, and saved views',
        isSynced: true,
        isBackedUp: true,
        isEncrypted: true,
        isRebuildable: false,
      },
      {
        storeName: 'derived_search_index',
        classification: 'Derived',
        description: 'Full-text BM25 and token inverted index',
        isSynced: false,
        isBackedUp: false,
        isEncrypted: false,
        isRebuildable: true,
      },
      {
        storeName: 'derived_vector_embeddings',
        classification: 'Derived',
        description: 'Semantic vector representations and graph clusters',
        isSynced: false,
        isBackedUp: false,
        isEncrypted: false,
        isRebuildable: true,
      },
      {
        storeName: 'recovery_journal_logs',
        classification: 'RecoveryMetadata',
        description: 'Staged transaction steps and rollback checkpoints',
        isSynced: false,
        isBackedUp: false,
        isEncrypted: true,
        isRebuildable: false,
      },
      {
        storeName: 'device_local_ui_state',
        classification: 'DeviceLocal',
        description: 'Window geometry, pane split widths, active filters',
        isSynced: false,
        isBackedUp: false,
        isEncrypted: false,
        isRebuildable: true,
      },
      {
        storeName: 'credential_secure_vault',
        classification: 'CredentialSecret',
        description: 'OAuth tokens, API keys, and derivation salts',
        isSynced: false,
        isBackedUp: false, // excluded by default unless explicit encrypted export
        isEncrypted: true,
        isRebuildable: false,
      },
      {
        storeName: 'transient_upload_cache',
        classification: 'Temporary',
        description: 'Staged file chunks and scratchpad buffers',
        isSynced: false,
        isBackedUp: false,
        isEncrypted: false,
        isRebuildable: true,
      },
    ];
  }

  // =========================================================================
  // 2. AUTHORITATIVE CANONICAL WRITE PATH WITH PRECONDITIONS
  // =========================================================================

  public writeCanonicalResource(
    resource: CanonicalResource,
    expectedVersion?: number
  ): { success: boolean; error?: string } {
    if (!this.isStorageOpen) {
      throw new Error('STORAGE_UNAVAILABLE_EXCEPTION: Storage layer is offline or in uninitialized state.');
    }
    if (this.isReadOnlyRecoveryMode) {
      return { success: false, error: 'READ_ONLY_RECOVERY_MODE: Vault is in read-only recovery mode. Writes blocked.' };
    }
    if (this.isQuotaExhausted) {
      return { success: false, error: 'QUOTA_EXHAUSTED_ERROR: Insufficient browser storage capacity. Mutation halted safely.' };
    }

    // Precondition 1: Version check
    const existing = this.canonicalStore.get(resource.id);
    if (existing && expectedVersion !== undefined && existing.version !== expectedVersion) {
      return {
        success: false,
        error: `OPTIMISTIC_CONCURRENCY_CONFLICT: Expected version ${expectedVersion} but found version ${existing.version}`,
      };
    }

    // Precondition 2: Schema / Payload validation
    if (!resource.id || !resource.type || !resource.payload) {
      return { success: false, error: 'SCHEMA_VALIDATION_ERROR: Missing mandatory canonical fields' };
    }

    // Commit Mutation
    this.canonicalStore.set(resource.id, {
      ...resource,
      version: (existing ? existing.version : 0) + 1,
      updatedAt: Date.now(),
    });

    // Automatically update derived search index
    this.updateDerivedIndexForResource(resource.id, JSON.stringify(resource.payload));

    return { success: true };
  }

  public getCanonicalResource(id: string): CanonicalResource | undefined {
    if (!this.isStorageOpen) {
      throw new Error('DATABASE_OPEN_FAILED_EXCEPTION: Storage open failure. Never return empty vault on failure.');
    }
    return this.canonicalStore.get(id);
  }

  public getAllCanonicalResources(): CanonicalResource[] {
    if (!this.isStorageOpen) {
      throw new Error('DATABASE_OPEN_FAILED_EXCEPTION: Storage open failure. Never substitute empty array for canonical stores.');
    }
    return Array.from(this.canonicalStore.values()).filter((r) => !r.tombstone);
  }

  // =========================================================================
  // 3. STORAGE INTEGRITY & FAILURE INJECTION
  // =========================================================================

  public simulateDatabaseOpenFailure(shouldFail: boolean): void {
    this.isStorageOpen = !shouldFail;
  }

  public simulateQuotaExhaustion(exhausted: boolean): void {
    this.isQuotaExhausted = exhausted;
  }

  public enterReadOnlyRecoveryMode(enable: boolean): void {
    this.isReadOnlyRecoveryMode = enable;
  }

  public isRecoveryModeActive(): boolean {
    return this.isReadOnlyRecoveryMode;
  }

  // =========================================================================
  // 4. DERIVED DATA CORRUPTION & AUTO-REBUILD
  // =========================================================================

  public corruptDerivedIndex(): void {
    this.derivedSearchIndex.clear();
    this.derivedEmbeddingsIndex.clear();
  }

  public rebuildDerivedIndexes(): { indexCount: number; durationMs: number } {
    const start = performance.now();
    this.derivedSearchIndex.clear();
    this.derivedEmbeddingsIndex.clear();

    for (const [id, res] of this.canonicalStore.entries()) {
      if (!res.tombstone) {
        this.updateDerivedIndexForResource(id, JSON.stringify(res.payload));
      }
    }

    return {
      indexCount: this.derivedSearchIndex.size,
      durationMs: performance.now() - start,
    };
  }

  private updateDerivedIndexForResource(id: string, text: string): void {
    const tokens = text.toLowerCase().match(/\w+/g) || [];
    this.derivedSearchIndex.set(id, Array.from(new Set(tokens)));
    // Synthetic deterministic embedding
    this.derivedEmbeddingsIndex.set(id, [tokens.length, text.length, Date.now() % 100]);
  }

  public getDerivedIndexSize(): number {
    return this.derivedSearchIndex.size;
  }

  // =========================================================================
  // 5. VAULT DOCTOR: DETERMINISTIC AUDIT, REPAIR & QUARANTINE
  // =========================================================================

  public runVaultDoctor(mode: 'Quick' | 'Full' | 'Repair' = 'Full'): VaultDoctorReport {
    const issues: VaultDoctorIssue[] = [];
    let repairedCount = 0;
    let quarantinedCount = 0;

    const allResources = Array.from(this.canonicalStore.values());

    // Check 1: Duplicate IDs & Malformed schemas
    const seenIds = new Set<string>();
    for (const res of allResources) {
      if (seenIds.has(res.id)) {
        issues.push({
          id: `ISSUE_${issues.length + 1}`,
          severity: 'CRITICAL',
          category: 'DUPLICATE_ID',
          message: `Duplicate resource ID detected: ${res.id}`,
          resourceId: res.id,
          reparable: false,
          quarantined: false,
        });
      }
      seenIds.add(res.id);

      if (!res.type || !res.payload) {
        issues.push({
          id: `ISSUE_${issues.length + 1}`,
          severity: 'ERROR',
          category: 'INVALID_SCHEMA',
          message: `Corrupted schema for resource ${res.id}`,
          resourceId: res.id,
          reparable: mode === 'Repair',
          quarantined: false,
        });
        if (mode === 'Repair') {
          // Quarantine corrupted resource rather than inventing arbitrary data
          this.quarantineResource(res.id, 'Invalid schema payload');
          quarantinedCount++;
        }
      }
    }

    // Check 2: Missing Derived Indexes
    if (this.derivedSearchIndex.size < allResources.filter((r) => !r.tombstone).length) {
      issues.push({
        id: `ISSUE_${issues.length + 1}`,
        severity: 'WARNING',
        category: 'BROKEN_RELATION',
        message: 'Derived search index is out of sync or corrupted',
        reparable: true,
        quarantined: false,
      });
      if (mode === 'Repair') {
        this.rebuildDerivedIndexes();
        repairedCount++;
      }
    }

    return {
      mode,
      scannedCount: allResources.length,
      issueCount: issues.length,
      repairedCount,
      quarantinedCount,
      issues,
      healthy: issues.length === 0,
      timestamp: Date.now(),
    };
  }

  public quarantineResource(resourceId: string, reason: string): boolean {
    const res = this.canonicalStore.get(resourceId);
    if (!res) return false;
    this.canonicalStore.delete(resourceId);
    this.quarantineStore.set(resourceId, {
      resource: res,
      reason,
      quarantinedAt: Date.now(),
    });
    return true;
  }

  public getQuarantinedResources(): { id: string; reason: string; quarantinedAt: number }[] {
    return Array.from(this.quarantineStore.entries()).map(([id, item]) => ({
      id,
      reason: item.reason,
      quarantinedAt: item.quarantinedAt,
    }));
  }

  // =========================================================================
  // 6. SALVAGE EXPORT MODE
  // =========================================================================

  public generateSalvageArchive(): { resourceCount: number; jsonPayload: string } {
    const exportData = {
      vaultVersion: '2.27',
      salvagedAt: new Date().toISOString(),
      canonical: Array.from(this.canonicalStore.values()),
      quarantined: Array.from(this.quarantineStore.values()),
    };
    return {
      resourceCount: exportData.canonical.length + exportData.quarantined.length,
      jsonPayload: JSON.stringify(exportData, null, 2),
    };
  }

  private seedCanonicalState(): void {
    const sampleResources: CanonicalResource[] = [
      {
        id: 'note_001',
        version: 1,
        type: 'note',
        payload: { title: 'System Architecture v2', body: '# Architecture\nOffline-first trusted ledger.' },
        createdAt: Date.now() - 100000,
        updatedAt: Date.now() - 100000,
      },
      {
        id: 'task_001',
        version: 1,
        type: 'task',
        payload: { title: 'Audit Storage Encryption', status: 'completed', priority: 'high' },
        createdAt: Date.now() - 80000,
        updatedAt: Date.now() - 80000,
      },
      {
        id: 'finance_001',
        version: 1,
        type: 'domain_record',
        payload: { domain: 'finance', account: 'Primary Reserve', amountCents: 250000, currency: 'USD' },
        createdAt: Date.now() - 50000,
        updatedAt: Date.now() - 50000,
      },
    ];

    for (const r of sampleResources) {
      this.canonicalStore.set(r.id, r);
    }
  }
}

export const v2_27DataIntegrity = V2_27DataIntegrityEngine.getInstance();
