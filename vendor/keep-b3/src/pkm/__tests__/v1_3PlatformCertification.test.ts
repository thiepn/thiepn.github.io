/**
 * V1.3 Platform Quality, Native Integration & Cross-Device Experience Certification Suite
 * Comprehensive automated validation covering capability registry, deep link security,
 * native notifications, secure credential isolation, lifecycle state preservation,
 * and cross-device continuity.
 */

import { platformRegistry } from '../platform/platformCapabilityRegistry';
import { deepLinkRouter } from '../platform/deepLinkRouter';
import { platformNotificationService } from '../platform/platformNotificationService';
import { secureStorageAdapter } from '../platform/secureStorageAdapter';
import { platformLifecycleService } from '../platform/platformLifecycleService';
import { crossDeviceContinuityService } from '../platform/crossDeviceContinuityService';
import { pwaUpdateCoordinator } from '../platform/pwaUpdateCoordinator';
import { tabletWorkspaceEngine } from '../platform/tabletWorkspaceEngine';
import { permissionManager } from '../platform/permissionManager';
import { CanonicalReminder } from '../platform/platformTypes';

interface TestResult {
  passed: number;
  failed: number;
  errors: string[];
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

export async function runV1_3PlatformCertificationSuite(): Promise<TestResult> {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  const runTest = async (name: string, fn: () => Promise<void> | void) => {
    try {
      await fn();
      passed++;
      console.log(`  ✓ ${name}`);
    } catch (err: any) {
      failed++;
      const msg = `[${name}] ${err?.message || String(err)}`;
      errors.push(msg);
      console.error(`  ✗ ${name}: ${err?.message || err}`);
    }
  };

  console.log('\n================================================================');
  console.log('   V1.3 — PLATFORM QUALITY & NATIVE INTEGRATION CERTIFICATION   ');
  console.log('================================================================\n');

  // 1. Platform Capability Registry & Fallback Resolution
  await runTest('Platform capability registry detects runtime environment without crashes', () => {
    const caps = platformRegistry.getCapabilities();
    assert(typeof caps.platform === 'string', 'Platform should be defined');
    assert(typeof caps.deviceClass === 'string', 'Device class should be defined');
    assert(caps.filesystem.openFile === true, 'File open should be supported');
  });

  await runTest('Unsupported capabilities generate clean human-readable fallback message', () => {
    const msg = platformRegistry.getUnsupportedMessage('Live File System Watcher');
    assert(msg.includes('unavailable') && msg.includes('fallback'), 'Fallback message must be informative');
  });

  // 2. Unified Secure Deep Link Router
  await runTest('Deep link router successfully parses and routes canonical Note URI', () => {
    const { route, error } = deepLinkRouter.parseUrl('app://note/note_alpha_123');
    assert(error === undefined, 'Valid note deep link should not produce error');
    assert(route !== null, 'Route should be parsed');
    assert(route?.action === 'open_resource', 'Action must be open_resource');
    assert(route?.resourceType === 'note', 'Resource type must be note');
    assert(route?.resourceId === 'note_alpha_123', 'Resource ID must match');
  });

  await runTest('Deep link router successfully parses Search URI with query params', () => {
    const { route } = deepLinkRouter.parseUrl('app://search?q=quarterly+budget');
    assert(route?.action === 'search', 'Action must be search');
    assert(route?.searchQuery === 'quarterly budget', 'Search query must be extracted');
  });

  await runTest('Deep link router successfully parses Quick Capture with prefilled text', () => {
    const { route } = deepLinkRouter.parseUrl('pkm://capture?text=Meeting+with+Alice&url=https://example.com');
    assert(route?.action === 'quick_capture', 'Action must be quick_capture');
    assert(route?.captureText === 'Meeting with Alice', 'Capture text must match');
    assert(route?.captureUrl === 'https://example.com', 'Capture URL must match');
  });

  await runTest('SECURITY: Deep link router REJECTS path traversal and dangerous protocols', () => {
    const res1 = deepLinkRouter.parseUrl('app://../../../etc/passwd');
    assert(res1.route === null && res1.error?.code === 'MALICIOUS_DEEP_LINK_REJECTED', 'Path traversal must be rejected');

    const res2 = deepLinkRouter.parseUrl('javascript:alert(1)');
    assert(res2.route === null && res2.error?.code === 'MALICIOUS_DEEP_LINK_REJECTED', 'JavaScript protocol must be rejected');

    const res3 = deepLinkRouter.parseUrl('file:///C:/Windows/System32/config/SAM');
    assert(res3.route === null && res3.error?.code === 'MALICIOUS_DEEP_LINK_REJECTED', 'File protocol must be rejected');
  });

  await runTest('SECURITY: Deep link router REJECTS destructive commands (delete, pay, send_email, execute)', () => {
    const res1 = deepLinkRouter.parseUrl('app://delete/note_123');
    assert(res1.route === null && res1.error?.code === 'MALICIOUS_DEEP_LINK_REJECTED', 'Direct delete link must be rejected');

    const res2 = deepLinkRouter.parseUrl('app://pay?amount=500');
    assert(res2.route === null && res2.error?.code === 'MALICIOUS_DEEP_LINK_REJECTED', 'Payment action must be rejected');

    const res3 = deepLinkRouter.parseUrl('app://execute?cmd=rm+-rf');
    assert(res3.route === null && res3.error?.code === 'MALICIOUS_DEEP_LINK_REJECTED', 'Code execution must be rejected');
  });

  await runTest('Deep link router safely queues destination when vault is locked', () => {
    deepLinkRouter.setVaultLockStatus(true);
    let dispatchedRoute: any = null;
    const unsub = deepLinkRouter.subscribe((r) => {
      dispatchedRoute = r;
    });

    const handled = deepLinkRouter.handleUrl('app://note/confidential_project_99');
    assert(handled === true, 'Handled should return true');
    assert(dispatchedRoute === null, 'Route must NOT be dispatched immediately while vault is locked');

    // Unlock vault -> Queued route dispatches
    deepLinkRouter.setVaultLockStatus(false);
    assert(dispatchedRoute !== null, 'Queued route should dispatch after unlock');
    assert(dispatchedRoute?.resourceId === 'confidential_project_99', 'Dispatched resource ID must match');
    unsub();
  });

  // 3. Native Notifications & Canonical Reminder Mapping
  await runTest('Platform notification schedules canonical reminder with mapped ID', async () => {
    const futureIso = new Date(Date.now() + 3600000).toISOString();
    const reminder: CanonicalReminder = {
      id: 'task_rem_001',
      resourceId: 'task_001',
      resourceType: 'task',
      title: 'Review Q3 Financial Strategy',
      scheduledTimeIso: futureIso,
      isSensitive: true,
    };

    platformNotificationService.setVaultLockStatus(false);
    platformNotificationService.setPrivacyMode('full');

    const record = await platformNotificationService.scheduleReminder(reminder);
    assert(record !== null, 'Notification record should be scheduled');
    assert(record?.nativeId === 'rem_task_rem_001', 'Native ID must map to canonical ID');
    assert(record?.title === 'Review Q3 Financial Strategy', 'Full title should display in full mode');
  });

  await runTest('Platform notification sanitizes sensitive reminder titles in sanitized mode', async () => {
    const futureIso = new Date(Date.now() + 7200000).toISOString();
    const reminder: CanonicalReminder = {
      id: 'task_rem_002',
      resourceId: 'task_002',
      resourceType: 'task',
      title: 'Doctor Appointment - Blood Test',
      scheduledTimeIso: futureIso,
      isSensitive: true,
    };

    platformNotificationService.setPrivacyMode('sanitized');
    const record = await platformNotificationService.scheduleReminder(reminder);
    assert(record !== null, 'Record scheduled');
    assert(record?.title === 'Scheduled Task Reminder', 'Sensitive title must be sanitized');
  });

  await runTest('Completing task or updating due date cancels obsolete native notification', async () => {
    const cancelled = platformNotificationService.cancelReminder('task_rem_001');
    assert(cancelled === true, 'Reminder should be successfully cancelled');
    const records = platformNotificationService.getScheduledRecords();
    const found = records.find((r) => r.canonicalReminderId === 'task_rem_001');
    assert(!found, 'Cancelled reminder must no longer exist in active schedule');
  });

  // 4. Secure Credential Storage & Biometric Key Wrapping
  await runTest('Secure storage persists external API keys and tokens', async () => {
    const res = await secureStorageAdapter.setCredential('github_pat_main', 'ghp_secretToken12345', 'git');
    assert(res.success === true, 'Credential set should succeed');

    const retrieved = await secureStorageAdapter.getCredential('github_pat_main');
    assert(retrieved === 'ghp_secretToken12345', 'Retrieved credential must match stored token');
  });

  await runTest('SECURITY INVARIANT: Storing master vault password in plaintext is REJECTED', async () => {
    const res = await secureStorageAdapter.setCredential('master_password', 'MySuperSecretVaultPass123!', 'session_token');
    assert(res.success === false, 'Plaintext master password storage must be rejected');
    assert(res.error?.code === 'MALICIOUS_DEEP_LINK_REJECTED', 'Error code should reflect security rejection');
  });

  await runTest('Biometric convenience unlock wraps session key with password fallback', async () => {
    const mockDerivedKey = '0123456789abcdef0123456789abcdef';
    const enabled = await secureStorageAdapter.enableBiometricUnlock(mockDerivedKey);
    assert(enabled === true, 'Biometric enable should succeed');

    const status = secureStorageAdapter.getBiometricStatus();
    assert(status.isEnabled === true, 'Biometric status should reflect enabled state');
    assert(status.passwordFallbackRequired === true, 'Password fallback must always remain required');

    const unlockedKey = await secureStorageAdapter.unlockWithBiometric();
    assert(unlockedKey === mockDerivedKey, 'Biometric unlock must return valid unwrapped key');

    secureStorageAdapter.disableBiometricUnlock();
    assert(secureStorageAdapter.getBiometricStatus().isEnabled === false, 'Biometric status should be disabled');
  });

  // 5. App Lifecycle & Process Death Durability
  await runTest('Lifecycle manager flushes registered write queues upon backgrounding', async () => {
    const state = { flushed: false };
    const unsub = platformLifecycleService.registerFlushCallback(async () => {
      state.flushed = true;
    });

    await platformLifecycleService.flushPendingWrites();
    assert(state.flushed === true, 'Flush callback must be executed');
    unsub();
  });

  await runTest('Lifecycle manager saves and restores session resume state across restarts', () => {
    platformLifecycleService.saveResumeState({
      lastActiveResourceId: 'note_project_delta',
      lastActiveResourceType: 'note',
      activeContextId: 'ctx_work_daily',
    });

    const restored = platformLifecycleService.getResumeState();
    assert(restored !== null, 'Resume state must be restored');
    assert(restored?.lastActiveResourceId === 'note_project_delta', 'Resource ID should match');
    assert(restored?.activeContextId === 'ctx_work_daily', 'Context ID should match');
  });

  // 6. PWA Updates & Share Target Ingestion
  await runTest('PwaUpdateCoordinator respects dirty editor state before applying updates', () => {
    pwaUpdateCoordinator.setEditorDirtyState(true);
    const applied = pwaUpdateCoordinator.applyUpdateNow(false);
    assert(applied === false, 'Update reload must be blocked while editor is actively dirty');

    pwaUpdateCoordinator.setEditorDirtyState(false);
  });

  await runTest('Share target ingestion enforces idempotency and stages safely when locked', () => {
    const sharePayload = {
      id: 'share_001',
      title: 'Interesting Research Article',
      url: 'https://arxiv.org/abs/2401.0001',
      idempotencyKey: 'idemp_key_arxiv_2401',
    };

    // 1. Ingest while locked -> Staged
    const res1 = pwaUpdateCoordinator.ingestSharedItem(sharePayload, true);
    assert(res1.success === true && res1.staged === true && res1.duplicate === false, 'Payload should be staged');

    // 2. Duplicate intent delivery -> Handled idempotently
    const res2 = pwaUpdateCoordinator.ingestSharedItem(sharePayload, true);
    assert(res2.success === true && res2.duplicate === true, 'Duplicate share intent must be ignored');

    // 3. Unlock -> Drained
    const drained = pwaUpdateCoordinator.drainStagedShares();
    assert(drained.length === 1, 'Exactly 1 share item should be drained after unlock');
    assert(drained[0].id === 'share_001', 'Drained payload ID should match');
  });

  // 7. Adaptive Tablet & Multi-Pane Layout Engine
  await runTest('Tablet layout engine computes adaptive state and preserves pane selection', () => {
    const state = tabletWorkspaceEngine.getState();
    assert(typeof state.layoutMode === 'string', 'Layout mode should be defined');
    assert(typeof state.orientation === 'string', 'Orientation should be defined');

    tabletWorkspaceEngine.setSecondaryPane('pdf', 50);
    const updated = tabletWorkspaceEngine.getState();
    assert(updated.activeSecondaryPane === 'pdf', 'Secondary pane should be PDF reader');
    assert(updated.secondaryPaneWidthPercent === 50, 'Secondary width should be 50%');
  });

  // 8. Cross-Device Continuity & Settings Locality
  await runTest('Cross-device continuity separates device-local settings from synced state', () => {
    const devSettings = crossDeviceContinuityService.getDeviceSettings();
    assert(typeof devSettings.closeToTray === 'boolean', 'Device-local setting closeToTray should exist');
    assert(typeof devSettings.notificationPrivacy === 'string', 'Notification privacy should exist');

    crossDeviceContinuityService.recordContinuation('ctx_q3_planning', 'Q3 Planning', 'note_roadmap_101');
    const cont = crossDeviceContinuityService.getContinuationState();
    assert(cont !== null, 'Continuation state should exist');
    assert(cont?.activeContextId === 'ctx_q3_planning', 'Active context ID should match');
    assert(cont?.recentResourceIds.includes('note_roadmap_101'), 'Recent resource ID should be listed');
  });

  await runTest('Offline availability indicator accurately flags synced vs locally cached assets', () => {
    const cached = crossDeviceContinuityService.getOfflineAvailability('asset_photo_1', true);
    assert(cached.status === 'available_offline', 'Locally cached asset should be available offline');

    const remoteOnly = crossDeviceContinuityService.getOfflineAvailability('asset_heavy_pdf_2', false);
    assert(remoteOnly.status === 'not_available_offline', 'Uncached remote asset should be marked not available offline');
  });

  // 9. On-Demand Permission Manager
  await runTest('Permission manager provides structured audit matrix with on-demand triggers', async () => {
    const matrix = await permissionManager.getAuditMatrix();
    assert(Array.isArray(matrix), 'Matrix should be an array');
    assert(matrix.length >= 5, 'Should audit at least 5 key platform permissions');

    const notif = matrix.find((p) => p.permission === 'notifications');
    assert(notif !== undefined, 'Notifications permission must be audited');
    assert(notif?.explanation.length! > 10, 'Notification explanation must be descriptive');
  });

  // 10. Platform Diagnostics & Latency Benchmark
  await runTest('Platform latency benchmark meets strict budget thresholds (<10ms)', () => {
    const start = performance.now();
    for (let i = 0; i < 500; i++) {
      deepLinkRouter.parseUrl(`app://note/perf_test_${i}`);
    }
    const elapsed = performance.now() - start;
    const avgPerLookup = elapsed / 500;
    assert(avgPerLookup < 0.1, `Deep link lookup avg (${avgPerLookup.toFixed(3)}ms) must be <0.1ms`);
  });

  console.log('\n================================================================');
  console.log(`V1.3 PLATFORM CERTIFICATION: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  return { passed, failed, errors };
}
