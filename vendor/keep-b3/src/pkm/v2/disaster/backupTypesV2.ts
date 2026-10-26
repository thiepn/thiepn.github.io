/**
 * PKM V2.6 — Disaster Recovery, Backup & Storage Integrity Types
 */

import { ResourceType } from '../core/resource/resourceCore';

export interface BackupFileEntryV2 {
  path: string;
  size: number;
  checksum: string; // SHA-256
  category: 'resource' | 'attachment' | 'metadata' | 'history' | 'config';
  resourceType?: ResourceType;
  resourceId?: string;
}

export interface BackupManifestV2 {
  formatVersion: '2.6.0' | string;
  appVersion: string;
  schemaVersion: number;
  createdAt: string;
  vaultId: string;
  encrypted: boolean;
  encryptionAlgorithm?: string;
  encryptionFormatVersion?: number;
  resourceCounts: Record<string, number>;
  attachmentCount: number;
  totalCanonicalBytes: number;
  files: BackupFileEntryV2[];
  completionMarker: string; // Cryptographic completion token verifying end of write
  generator: string;
}

export interface BackupArchiveV2 {
  manifest: BackupManifestV2;
  files: Record<string, string>; // path -> content (base64 or stringified json)
  checksum: string;
}

export type BackupVerificationLevel = 'structural' | 'restore_tested';

export interface BackupVerificationResultV2 {
  verified: boolean;
  level: BackupVerificationLevel;
  timestamp: string;
  archivePathOrName: string;
  manifestValid: boolean;
  checksumsMatch: boolean;
  totalFilesChecked: number;
  corruptFiles: Array<{ path: string; expectedChecksum: string; actualChecksum?: string; error?: string }>;
  missingFiles: string[];
  resourceCounts: Record<string, number>;
  attachmentCount: number;
  encryptionValid: boolean;
  error?: string;
  warnings: string[];
}

export interface BackupGenerationV2 {
  id: string;
  createdAt: string;
  destination: 'download' | 'filesystem_directory' | 'removable_media' | 'local_staging';
  filename: string;
  sizeBytes: number;
  checksum: string;
  encrypted: boolean;
  resourceCount: number;
  attachmentCount: number;
  verified: boolean;
  lastVerificationDate?: string;
  verificationLevel?: BackupVerificationLevel;
  isLastKnownGood: boolean;
}

export interface RestoreProgressV2 {
  stage: 'idle' | 'reading' | 'validating' | 'staging' | 'migrating' | 'verifying' | 'committing' | 'rebuilding_indexes' | 'completed' | 'failed';
  percent: number;
  currentStepMessage: string;
  processedItems: number;
  totalItems: number;
}

export interface RestoreReportV2 {
  success: boolean;
  mode: 'new_vault' | 'replace_current' | 'salvage';
  timestamp: string;
  restoredResourceCount: number;
  restoredAttachmentCount: number;
  migratedSchemasCount: number;
  quarantinedCount: number;
  warnings: string[];
  rebuiltIndexes: string[];
  syncBaselineResetRequired: boolean;
  preRestoreRecoveryPointId?: string;
  error?: string;
}

export interface SalvageReportV2 {
  success: boolean;
  totalEntriesScanned: number;
  recoveredCount: number;
  recoveredWithWarningsCount: number;
  corruptCount: number;
  missingCount: number;
  skippedCount: number;
  recoveredResources: Array<{ id: string; type: string; title: string; issues?: string[] }>;
  corruptedEntries: Array<{ path: string; error: string; rawSnippet?: string }>;
  exportPackageReady: boolean;
}

export interface QuarantineRecordV2 {
  id: string;
  resourceId: string;
  resourceType: string;
  quarantinedAt: string;
  reason: string;
  errorCode: string;
  rawPayload: string;
  suggestedRepair?: {
    repairType: 'frontmatter_fix' | 'schema_normalization' | 'strip_malformed_fields' | 'rebuild_relations';
    description: string;
    repairedPayload: string;
  };
}

export interface StorageCategoryBreakdownV2 {
  canonicalResourcesBytes: number;
  attachmentsBytes: number;
  revisionsAndRecoveryBytes: number;
  activityHistoryBytes: number;
  syncTombstonesBytes: number;
  derivedIndexesBytes: number;
  ephemeralCachesBytes: number;
  totalEstimatedBytes: number;
  availableStorageBytes?: number;
  isLowStorage: boolean;
}

export interface VaultDoctorIssueV2 {
  id: string;
  category: 'schema' | 'relation' | 'attachment' | 'domain_invariant' | 'index' | 'duplicate_id';
  severity: 'error' | 'warning' | 'info';
  title: string;
  description: string;
  resourceId?: string;
  resourceType?: string;
  affectedPath?: string;
  autoFixable: boolean;
  fixActionName?: string;
}

export interface VaultDoctorReportV2 {
  scanType: 'quick' | 'full';
  timestamp: string;
  durationMs: number;
  totalResourcesScanned: number;
  totalAttachmentsScanned: number;
  issues: VaultDoctorIssueV2[];
  quarantinedCount: number;
  healthy: boolean;
}
