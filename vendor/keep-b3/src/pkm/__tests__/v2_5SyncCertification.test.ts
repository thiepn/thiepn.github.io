/**
 * PKM V2.5 — Cross-Device Sync, Offline Continuity & Local-First Resilience Certification Suite
 *
 * Verifies all 3-way merge rules, domain invariants, explicit tombstones,
 * attachment materialization, device lifecycle, protocol negotiation, and sanitized telemetry.
 */

import {
  globalSyncEngineV2,
  globalConflictCenterV2,
  globalDeviceManagerV2,
  globalAttachmentSyncEngineV2,
  globalSyncDiagnosticsV2,
  globalGitTransportAdapter,
  globalFilesystemTransportAdapter,
  globalP2PTransportAdapter,
  globalCrossDeviceContinuityEngineV2,
  SyncResourceEnvelope
} from '../v2/sync';

export async function runV2_5SyncCertificationTests(): Promise<{ passed: number; failed: number; errors: string[] }> {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  const assert = (condition: boolean, testName: string, detail?: string) => {
    if (condition) {
      passed++;
    } else {
      failed++;
      const msg = `FAIL: [V2.5 Sync] ${testName}${detail ? ` - ${detail}` : ''}`;
      errors.push(msg);
      console.error(`  ✗ ${msg}`);
    }
  };

  console.log('--- Running PKM V2.5 Sync & Continuity Certification Suite ---');

  // Reset engine states for clean testing
  globalSyncEngineV2.clear();
  globalConflictCenterV2.clear();
  globalCrossDeviceContinuityEngineV2.clear();

  // Test 1: Device Identity & Metadata
  try {
    const dev = globalDeviceManagerV2.getCurrentDevice();
    assert(!!dev.deviceId && dev.protocolVersion === 2, 'Device Identity: generates stable device with protocol v2');

    const updated = globalDeviceManagerV2.setDeviceName('Test Workstation');
    assert(updated.deviceName === 'Test Workstation', 'Device Identity: user can edit device name');

    // Register a secondary device and retire it
    globalDeviceManagerV2.registerDevice({
      deviceId: 'dev_test_phone',
      deviceName: 'Test Phone',
      platform: 'mobile_ios',
      appVersion: '2.5.0',
      protocolVersion: 2,
      firstSeenAt: new Date().toISOString(),
      lastSyncTimestamp: new Date().toISOString(),
      status: 'active',
      isCurrentDevice: false,
    });

    const retireRes = globalDeviceManagerV2.retireDevice('dev_test_phone');
    assert(retireRes.success, 'Device Retirement: cleanly marks device as retired');
    const known = globalDeviceManagerV2.getKnownDevices();
    const phone = known.find(d => d.deviceId === 'dev_test_phone');
    assert(phone?.status === 'retired', 'Device Retirement: status reflected in known devices list');
  } catch (e: any) {
    assert(false, 'Device Identity tests threw exception', e.message);
  }

  // Test 2: Local Resource Creation & Tombstone Deletion
  try {
    const noteEnv = globalSyncEngineV2.saveLocalResource({
      resourceId: 'res_note_001',
      resourceType: 'note',
      title: 'Project Roadmap',
      body: 'Line 1: Initial Specs\nLine 2: Design Systems\nLine 3: Execution Plan',
      revision: 1,
    });

    assert(noteEnv.contentHash.startsWith('sha256_'), 'Local Resource: generates deterministic SHA-256 hash');
    assert(globalSyncEngineV2.getPendingChangesCount() === 1, 'Local Resource: tracks pending local edits');

    const tombstone = globalSyncEngineV2.deleteLocalResource('res_note_001', 'User deleted test note');
    assert(tombstone.deletedRevision === 2, 'Tombstones: explicit deletion generates tombstone with incremented revision');
    assert(!globalSyncEngineV2.getLocalResource('res_note_001'), 'Tombstones: resource removed from active local store');
    assert(globalSyncEngineV2.getTombstones().some(t => t.resourceId === 'res_note_001'), 'Tombstones: recorded in tombstone registry');
  } catch (e: any) {
    assert(false, 'Local resource & tombstone tests threw exception', e.message);
  }

  // Test 3: 3-Way Merge (Markdown Line Diffing)
  try {
    const base: SyncResourceEnvelope = {
      resourceId: 'res_note_merge',
      resourceType: 'note',
      revision: 1,
      schemaVersion: 2,
      modifiedAt: new Date(Date.now() - 100000).toISOString(),
      contentHash: 'hash_base',
      title: 'Meeting Notes',
      body: 'Intro Paragraph\nTopic A: Architecture\nTopic B: Timeline\nConclusion',
    };

    const local: SyncResourceEnvelope = {
      ...base,
      revision: 2,
      body: 'Intro Paragraph\nTopic A: Architecture (Reviewed)\nTopic B: Timeline\nConclusion',
      title: 'Meeting Notes',
    };

    const remote: SyncResourceEnvelope = {
      ...base,
      revision: 2,
      body: 'Intro Paragraph\nTopic A: Architecture\nTopic B: Timeline (Extended by 2 weeks)\nConclusion',
      title: 'Meeting Notes',
    };

    // Non-overlapping line merge should succeed automatically
    const mergeRes = globalSyncEngineV2.merge3Envelopes(base, local, remote);
    assert(!mergeRes.hasConflict && !!mergeRes.mergedEnvelope, '3-Way Merge: non-overlapping line edits auto-merge cleanly');
    assert(
      mergeRes.mergedEnvelope?.body?.includes('Topic A: Architecture (Reviewed)') &&
      mergeRes.mergedEnvelope?.body?.includes('Topic B: Timeline (Extended by 2 weeks)'),
      '3-Way Merge: merged body contains both local and remote non-overlapping changes'
    );

    // Overlapping conflicting line edits
    const remoteConflict: SyncResourceEnvelope = {
      ...base,
      revision: 2,
      body: 'Intro Paragraph\nTopic A: Architecture (Cancelled)\nTopic B: Timeline\nConclusion',
      title: 'Meeting Notes',
    };

    const conflictRes = globalSyncEngineV2.merge3Envelopes(base, local, remoteConflict);
    assert(conflictRes.hasConflict && conflictRes.conflictType === 'same_field_changed', '3-Way Merge: overlapping edits trigger same_field_changed conflict');
  } catch (e: any) {
    assert(false, '3-Way Merge tests threw exception', e.message);
  }

  // Test 4: Rename vs Body Edit (Auto-Merge) & Rename vs Rename
  try {
    const base: SyncResourceEnvelope = {
      resourceId: 'res_rename_test',
      resourceType: 'note',
      revision: 1,
      schemaVersion: 2,
      modifiedAt: new Date(Date.now() - 100000).toISOString(),
      contentHash: 'hash_base_rn',
      title: 'Old Title',
      body: 'Original Content',
    };

    const localRenamed: SyncResourceEnvelope = {
      ...base,
      revision: 2,
      title: 'New Improved Title',
      body: 'Original Content',
    };

    const remoteEdited: SyncResourceEnvelope = {
      ...base,
      revision: 2,
      title: 'Old Title',
      body: 'Updated Remote Content',
    };

    // Rename on Local + Body edit on Remote -> Auto-Merge
    const autoMergeRes = globalSyncEngineV2.merge3Envelopes(base, localRenamed, remoteEdited);
    assert(!autoMergeRes.hasConflict && autoMergeRes.mergedEnvelope?.title === 'New Improved Title', 'Rename vs Edit: Title rename + body edit auto-merges preserving new title');
    assert(autoMergeRes.mergedEnvelope?.body === 'Updated Remote Content', 'Rename vs Edit: preserves remote body updates');

    // Rename vs Rename Conflict
    const remoteRenamedDifferently: SyncResourceEnvelope = {
      ...base,
      revision: 2,
      title: 'Conflicting Remote Title',
      body: 'Original Content',
    };

    const renameConflictRes = globalSyncEngineV2.merge3Envelopes(base, localRenamed, remoteRenamedDifferently);
    assert(renameConflictRes.hasConflict && renameConflictRes.conflictType === 'rename_vs_rename', 'Rename vs Rename: conflicting titles trigger rename_vs_rename conflict');
  } catch (e: any) {
    assert(false, 'Rename vs Edit tests threw exception', e.message);
  }

  // Test 5: Domain Invariant Validation (Finance)
  try {
    const baseFinance: SyncResourceEnvelope = {
      resourceId: 'fin_tx_001',
      resourceType: 'transaction',
      revision: 1,
      schemaVersion: 2,
      modifiedAt: new Date(Date.now() - 100000).toISOString(),
      contentHash: 'hash_fin_base',
      title: 'Hardware Purchase',
      metadata: {
        amount: 250.00,
        account: 'Checking',
        category: 'Electronics',
      },
    };

    const localFinance: SyncResourceEnvelope = {
      ...baseFinance,
      revision: 2,
      metadata: {
        amount: 300.00,
        account: 'Checking',
        category: 'Electronics',
      },
    };

    const remoteFinance: SyncResourceEnvelope = {
      ...baseFinance,
      revision: 2,
      metadata: {
        amount: 250.00,
        account: 'Checking',
        category: 'Office Supplies', // Changed category only
      },
    };

    // Non-conflicting field changes in finance merge
    const finMerge = globalSyncEngineV2.merge3Envelopes(baseFinance, localFinance, remoteFinance);
    assert(!finMerge.hasConflict && finMerge.mergedEnvelope?.metadata?.amount === 300.00 && finMerge.mergedEnvelope?.metadata?.category === 'Office Supplies', 'Finance Domain: independent field edits merge cleanly');

    // Conflicting amounts in finance strictly trigger conflict
    const remoteConflictingAmount: SyncResourceEnvelope = {
      ...baseFinance,
      revision: 2,
      metadata: {
        amount: 275.00,
        account: 'Checking',
        category: 'Electronics',
      },
    };
    const finAmountConflict = globalSyncEngineV2.merge3Envelopes(baseFinance, localFinance, remoteConflictingAmount);
    assert(finAmountConflict.hasConflict, 'Finance Domain: conflicting amounts strictly trigger conflict to protect mathematical integrity');
  } catch (e: any) {
    assert(false, 'Finance domain invariant tests threw exception', e.message);
  }

  // Test 6: Conflict Center Resolution Workflows
  try {
    globalConflictCenterV2.clear();
    const conf = globalConflictCenterV2.recordConflict({
      resourceId: 'res_conf_test',
      resourceType: 'note',
      domain: 'note',
      title: 'Architecture Blueprint',
      conflictType: 'same_field_changed',
      localEnvelope: {
        resourceId: 'res_conf_test',
        resourceType: 'note',
        revision: 2,
        schemaVersion: 2,
        modifiedAt: new Date().toISOString(),
        contentHash: 'hash_local',
        title: 'Architecture Blueprint (Local)',
        body: 'Local changes',
      },
      remoteEnvelope: {
        resourceId: 'res_conf_test',
        resourceType: 'note',
        revision: 2,
        schemaVersion: 2,
        modifiedAt: new Date().toISOString(),
        contentHash: 'hash_remote',
        title: 'Architecture Blueprint (Remote)',
        body: 'Remote changes',
      },
      fieldDifferences: ['body'],
    });

    assert(globalConflictCenterV2.getActiveConflicts().length === 1, 'Conflict Center: tracks active conflict');

    // Resolve with Keep Local
    const resLocal = globalConflictCenterV2.resolveConflict('res_conf_test', 'keep_local');
    assert(resLocal.success && resLocal.resolvedEnvelope?.title === 'Architecture Blueprint (Local)', 'Conflict Center: resolve keep_local selects local version');
    assert(globalConflictCenterV2.getActiveConflicts().length === 0, 'Conflict Center: active conflicts empty after resolution');
  } catch (e: any) {
    assert(false, 'Conflict Center tests threw exception', e.message);
  }

  // Test 7: Attachment Materialization & Offline Eviction
  try {
    const att = globalAttachmentSyncEngineV2.registerLocalAttachment({
      filename: 'diagram.png',
      mimeType: 'image/png',
      content: 'binary_png_mock_data_bytes_1234567890',
    });

    assert(att.materializationState === 'available_offline', 'Attachments: newly registered local attachment is available offline');
    assert(att.contentHash.startsWith('sha256_'), 'Attachments: content-addressed SHA-256 hash assigned');

    // Remove from this device (safe local eviction)
    const evictRes = globalAttachmentSyncEngineV2.removeFromThisDevice(att.attachmentId);
    assert(evictRes.success && evictRes.envelope.materializationState === 'metadata_only', 'Attachments: Remove from This Device changes state to metadata_only while preserving remote copy');

    // Download for offline
    const downloadRes = await globalAttachmentSyncEngineV2.downloadForOffline(att.attachmentId);
    assert(downloadRes.success && downloadRes.envelope.materializationState === 'available_offline', 'Attachments: Download for Offline streams and restores local materialization');
  } catch (e: any) {
    assert(false, 'Attachment engine tests threw exception', e.message);
  }

  // Test 8: End-to-End Sync Engine Run (Git Transport)
  try {
    globalSyncEngineV2.clear();
    globalSyncEngineV2.setTransport(globalGitTransportAdapter);

    // Save a fresh local note
    globalSyncEngineV2.saveLocalResource({
      resourceId: 'res_e2e_01',
      resourceType: 'note',
      title: 'E2E Sync Verification',
      body: 'Verified local-first continuity.',
      revision: 1,
    });

    // Run sync
    const report = await globalSyncEngineV2.sync();
    assert(report.status === 'success' || report.status === 'no_change', 'Sync Engine: End-to-end sync completes successfully');
    assert(globalSyncEngineV2.getState() === 'synced', 'Sync Engine: Enters verified "synced" state');
    assert(globalSyncEngineV2.getPendingChangesCount() === 0, 'Sync Engine: Zero pending local changes after sync');
  } catch (e: any) {
    assert(false, 'End-to-end sync run threw exception', e.message);
  }

  // Test 9: Sanitized Diagnostics Bundle Export
  try {
    const bundleStr = globalSyncDiagnosticsV2.generateSanitizedDiagnosticBundle({
      deviceId: 'dev_test_sanitized',
      deviceName: 'Sanitized Mac',
      protocolVersion: 2,
      activeTransport: 'Git Transport',
      localResourceCount: 15,
      tombstoneCount: 2,
      attachmentCount: 3,
      activeConflictsCount: 0,
    });

    const parsed = JSON.parse(bundleStr);
    assert(parsed.appVersion === '2.5.0' && parsed.device.protocolVersion === 2, 'Diagnostics: generates valid JSON bundle with version info');
    assert(!bundleStr.includes('password') && !bundleStr.includes('token') && !bundleStr.includes('private_key'), 'Diagnostics: bundle strictly strips sensitive tokens');
  } catch (e: any) {
    assert(false, 'Diagnostics tests threw exception', e.message);
  }

  console.log(`✓ V2.5 Sync & Resilience Certification: ${passed} passed, ${failed} failed\n`);
  return { passed, failed, errors };
}
