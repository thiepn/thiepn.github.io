/**
 * PKM V2.6 — Disaster Recovery, Storage Integrity & Backup Certification Suite
 *
 * Comprehensive tests validating:
 * 1. Data classification and persistence boundaries
 * 2. Versioned streaming backup creation with SHA-256 checksums and completion markers
 * 3. Multi-level verification (structural & restore-tested dry-runs)
 * 4. Staged clean restore with pre-restore recovery point safety
 * 5. Partial salvage engine for damaged or truncated archives
 * 6. Corruption isolation & Quarantine store with deterministic repair previews
 * 7. Vault Doctor V2 deep invariant audit & repair
 * 8. Storage category breakdown & safe rebuildable cache compaction
 * 9. Selective item restore from archive
 */

import {
  V2_6_DATA_CLASSIFICATION_MATRIX,
  V2_6_DISASTER_SCENARIOS,
} from '../v2/audit/v2_6BackupStorageAudit';
import { backupServiceV2 } from '../v2/disaster/backupServiceV2';
import { backupVerifierV2 } from '../v2/disaster/verifyBackupV2';
import { restoreEngineV2 } from '../v2/disaster/restoreEngineV2';
import { salvageEngineV2 } from '../v2/disaster/salvageEngineV2';
import { quarantineStoreV2 } from '../v2/disaster/quarantineStoreV2';
import { vaultDoctorV2 } from '../v2/disaster/vaultDoctorV2';
import { storageResilienceManagerV2 } from '../v2/disaster/storageResilienceV2';
import { selectiveRestoreEngineV2 } from '../v2/disaster/selectiveRestoreV2';
import { SyncResourceEnvelope } from '../v2/sync/syncTypes';

export async function runV2_6DisasterRecoveryCertificationTests(): Promise<{
  passed: number;
  failed: number;
  errors: string[];
}> {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  const assert = (condition: boolean, testName: string, detail?: string) => {
    if (condition) {
      passed++;
    } else {
      failed++;
      const msg = `FAIL: [V2.6 Disaster Recovery] ${testName}${detail ? ` - ${detail}` : ''}`;
      errors.push(msg);
      console.error(`  ✗ ${msg}`);
    }
  };

  console.log('--- Running PKM V2.6 Disaster Recovery & Storage Resilience Suite ---');

  // Reset quarantine state
  quarantineStoreV2.clear();

  // 1. Data Classification Matrix
  const canonical = V2_6_DATA_CLASSIFICATION_MATRIX.find(
    (c) => c.classification === 'canonical_user_data'
  );
  assert(
    !!canonical && canonical.includedInBackup && canonical.includedInSync && !canonical.rebuildableOnDemand,
    'Canonical user data is included in backup/sync and non-rebuildable'
  );

  const secrets = V2_6_DATA_CLASSIFICATION_MATRIX.find(
    (c) => c.classification === 'sensitive_secrets_credentials'
  );
  assert(
    !!secrets && !secrets.includedInBackup && !secrets.includedInSync,
    'Sensitive secrets and credentials are strictly excluded from backups'
  );

  assert(
    V2_6_DISASTER_SCENARIOS.length >= 8,
    'Disaster scenarios matrix defines all core failure modes'
  );

  // 2. Versioned Backup Creation
  const sampleResources: SyncResourceEnvelope[] = [
    {
      resourceId: 'note_v2_6_1',
      resourceType: 'note',
      schemaVersion: 2,
      revision: 1,
      modifiedAt: new Date().toISOString(),
      contentHash: 'hash_note_1',
      title: 'V2.6 Architecture Spec',
      body: 'Zero data loss guarantees',
      metadata: { oauth_token: 'SECRET_SHOULD_BE_STRIPPED' },
    },
    {
      resourceId: 'task_v2_6_1',
      resourceType: 'task',
      schemaVersion: 2,
      revision: 1,
      modifiedAt: new Date().toISOString(),
      contentHash: 'hash_task_1',
      title: 'Implement Disaster Recovery',
      body: 'Verified backups',
      metadata: { status: 'done' },
    },
  ];

  const sampleAttachments = [
    {
      id: 'att_v2_6_1',
      name: 'architecture.png',
      mimeType: 'image/png',
      dataBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      size: 68,
    },
  ];

  const backupResult = await backupServiceV2.createBackupArchive({
    customResources: sampleResources,
    customAttachments: sampleAttachments,
  });

  assert(
    backupResult.archive.manifest.formatVersion === '2.6.0',
    'Backup manifest has formatVersion 2.6.0'
  );
  assert(
    !!backupResult.archive.manifest.completionMarker,
    'Backup contains cryptographic completion marker'
  );
  assert(
    backupResult.archive.manifest.resourceCounts.note === 1 &&
      backupResult.archive.manifest.resourceCounts.task === 1,
    'Manifest accurately tallies resource counts'
  );
  assert(
    backupResult.archive.manifest.attachmentCount === 1,
    'Manifest accurately tallies attachments'
  );

  // Sensitive credentials stripping
  const storedNoteRaw = backupResult.archive.files['resources/note/note_v2_6_1.json'];
  assert(
    !storedNoteRaw.includes('SECRET_SHOULD_BE_STRIPPED'),
    'Credentials and sensitive tokens are stripped from resource envelopes during backup'
  );

  // 3. Multi-Level Verification
  const structuralCheck = await backupVerifierV2.verifyBackup(backupResult.rawJson, 'structural');
  assert(
    structuralCheck.verified && structuralCheck.manifestValid && structuralCheck.checksumsMatch,
    'Structural verification validates intact backup archive'
  );

  const restoreTestedCheck = await backupVerifierV2.verifyBackup(backupResult.rawJson, 'restore_tested');
  assert(
    restoreTestedCheck.verified && restoreTestedCheck.corruptFiles.length === 0,
    'Restore-tested dry-run verification succeeds on valid backup'
  );

  // Tamper detection
  const tampered = JSON.parse(backupResult.rawJson);
  tampered.files['resources/note/note_v2_6_1.json'] = JSON.stringify({
    resourceId: 'note_v2_6_1',
    resourceType: 'note',
    title: 'TAMPERED TITLE',
    body: 'Tampered content',
  });
  const tamperedCheck = await backupVerifierV2.verifyBackup(JSON.stringify(tampered));
  assert(
    !tamperedCheck.verified && tamperedCheck.corruptFiles.length > 0,
    'Checksum validation catches tampered file content'
  );

  // Truncated / Missing completion marker detection
  const truncated = JSON.parse(backupResult.rawJson);
  delete truncated.manifest.completionMarker;
  const truncatedCheck = await backupVerifierV2.verifyBackup(JSON.stringify(truncated));
  assert(
    !truncatedCheck.verified && !!truncatedCheck.error,
    'Verification rejects incomplete backup missing completion marker'
  );

  // Unsupported future format rejection
  const futureFormat = JSON.parse(backupResult.rawJson);
  futureFormat.manifest.formatVersion = '4.0.0';
  const futureCheck = await backupVerifierV2.verifyBackup(JSON.stringify(futureFormat));
  assert(
    !futureCheck.verified && !!futureCheck.error && futureCheck.error.includes('Unsupported future backup format'),
    'Verification safely rejects incompatible future backup formats'
  );

  // 4. Staged Clean Restore Pipeline
  const restoreReport = await restoreEngineV2.executeRestore(backupResult.rawJson, {
    mode: 'replace_current',
    currentVaultState: {
      notes: [],
      folders: [],
      savedSearches: [],
    },
  });
  assert(
    restoreReport.success && restoreReport.restoredResourceCount === 2,
    'Staged restore pipeline successfully restores resources'
  );
  assert(
    restoreReport.syncBaselineResetRequired === true,
    'Restore correctly flags sync baseline rebaseline requirement'
  );

  // 5. Partial Salvage Engine
  const damagedRaw = `
    {
      "files": {
        "resources/note/salvaged_doc.json": "{\\"resourceId\\":\\"salvaged_doc\\",\\"resourceType\\":\\"note\\",\\"title\\":\\"Surviving Spec\\",\\"body\\":\\"Intact text\\"}",
        "broken_record.json": "{ unclosed corrupted syntax
      }
    }
  `;
  const salvageReport = await salvageEngineV2.salvageDamagedArchive(damagedRaw);
  assert(
    salvageReport.success &&
      (salvageReport.recoveredCount >= 1 || salvageReport.recoveredWithWarningsCount >= 1) &&
      salvageReport.corruptCount >= 1,
    'Salvage engine recovers readable documents from damaged JSON archive'
  );
  assert(
    salvageReport.recoveredResources[0].title === 'Surviving Spec',
    'Salvaged resource content is intact'
  );

  // 6. Quarantine Store
  const qRecord = quarantineStoreV2.quarantineResource({
    resourceId: 'corrupt_item_99',
    resourceType: 'note',
    reason: 'Malformed frontmatter tags',
    errorCode: 'FRONTMATTER_UNCLOSED',
    rawPayload: '---title: Test\nUnclosed frontmatter',
  });
  assert(
    qRecord.id.startsWith('quarantine_') && quarantineStoreV2.getAll().length === 1,
    'Corrupt resources are isolated into Quarantine Store'
  );
  assert(
    qRecord.suggestedRepair?.repairType === 'frontmatter_fix',
    'Deterministic repair suggestion is generated for quarantined item'
  );
  const released = quarantineStoreV2.release(qRecord.id);
  assert(
    released && quarantineStoreV2.getAll().length === 0,
    'Quarantine release successfully unblocks resource'
  );

  // 7. Vault Doctor V2 Invariant Checks & Repair
  const docTestResources: SyncResourceEnvelope[] = [
    {
      resourceId: 'dup_res_1',
      resourceType: 'note',
      schemaVersion: 2,
      revision: 1,
      modifiedAt: new Date().toISOString(),
      contentHash: 'h1',
      title: 'First Copy',
    },
    {
      resourceId: 'dup_res_1', // Duplicate ID!
      resourceType: 'note',
      schemaVersion: 2,
      revision: 1,
      modifiedAt: new Date().toISOString(),
      contentHash: 'h2',
      title: 'Second Copy',
    },
    {
      resourceId: 'trans_corrupt',
      resourceType: 'transaction',
      schemaVersion: 2,
      revision: 1,
      modifiedAt: new Date().toISOString(),
      contentHash: 'h3',
      title: 'Coffee',
      metadata: { amount: 'invalid_string' },
    },
  ];

  const quickDoc = await vaultDoctorV2.runQuickCheck(docTestResources);
  assert(
    !quickDoc.healthy && quickDoc.issues.some((i) => i.category === 'duplicate_id'),
    'Vault Doctor quick scan detects duplicate resource IDs'
  );

  const fullDoc = await vaultDoctorV2.runFullIntegrityScan(docTestResources);
  assert(
    !fullDoc.healthy && fullDoc.issues.some((i) => i.category === 'domain_invariant'),
    'Vault Doctor full integrity scan detects domain invariant violations'
  );

  // 8. Storage Breakdown & Compaction
  const storageBreakdown = await storageResilienceManagerV2.getStorageBreakdown();
  assert(
    storageBreakdown.totalEstimatedBytes > 0,
    'Storage resilience manager computes categorized storage footprint'
  );

  const clearResult = await storageResilienceManagerV2.clearRebuildableData();
  assert(
    clearResult.clearedBytes > 0 && clearResult.rebuiltIndexes.length > 0,
    'Compaction safely clears only rebuildable indexes and caches'
  );

  // 9. Selective Item Restore
  const listItems = selectiveRestoreEngineV2.listArchiveItems(backupResult.rawJson);
  assert(
    listItems.items.length >= 2,
    'Selective restore engine lists individual items from archive'
  );

  const selectiveExtract = selectiveRestoreEngineV2.restoreSelectedItems(backupResult.rawJson, [
    'resources/note/note_v2_6_1.json',
  ]);
  assert(
    selectiveExtract.restoredCount === 1 && selectiveExtract.errors.length === 0,
    'Selective item extraction successfully restores individual resource'
  );

  return { passed, failed, errors };
}
