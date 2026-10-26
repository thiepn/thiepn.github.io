/**
 * V2.12 Native Platform Quality, Ecosystem Maturity & Everyday Workflow Refinement Test Suite
 */

import {
  V2_12_PLATFORM_AUDIT_RECORDS,
  V2_12_ECOSYSTEM_AUDIT_RECORDS,
  V2_12_QUALITY_VECTORS,
} from '../v2/ecosystem/platformEcosystemQualityAudit';
import { universalCaptureEngine } from '../v2/ecosystem/universalCaptureEngine';
import { nativeFileIntegrationRouter } from '../v2/ecosystem/nativeFileIntegrationRouter';
import { nativeMenuActionBridge } from '../v2/ecosystem/nativeMenuActionBridge';
import { keyboardShortcutsNormalizer } from '../v2/ecosystem/keyboardShortcutsNormalizer';
import { desktopLifecycleManager } from '../v2/ecosystem/desktopLifecycleManager';
import { mobilePlatformBridge } from '../v2/ecosystem/mobilePlatformBridge';
import { tabletWorkflowEngine } from '../v2/ecosystem/tabletWorkflowEngine';
import { restrainedNotificationOrchestrator } from '../v2/ecosystem/restrainedNotificationOrchestrator';
import { pluginEcosystemManager } from '../v2/ecosystem/pluginEcosystemManager';
import { connectorMaturityManager } from '../v2/ecosystem/connectorMaturityManager';
import { everydayWorkflowFrictionEngine } from '../v2/ecosystem/everydayWorkflowFrictionEngine';
import { v2_12PlatformCertificationEngine } from '../v2/ecosystem/v2_12PlatformCertificationEngine';

export function runV2_12PlatformEcosystemHardeningTests(): {
  passed: number;
  failed: number;
  errors: string[];
} {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      passed++;
    } else {
      failed++;
      errors.push(`FAIL: ${testName} ${detail ? `- ${detail}` : ''}`);
    }
  }

  // 1. Platform Audit & Capability Matrix (8 Platforms)
  try {
    assert(V2_12_PLATFORM_AUDIT_RECORDS.length === 8, 'Matrix covers all 8 target platforms');
    const platforms = V2_12_PLATFORM_AUDIT_RECORDS.map(p => p.platform);
    assert(platforms.includes('Web') && platforms.includes('Windows') && platforms.includes('macOS') && platforms.includes('Android') && platforms.includes('iOS'), 'All major OS platforms present');
    assert(V2_12_PLATFORM_AUDIT_RECORDS.every(p => p.status === 'Stable'), 'All 8 platforms are Stable');
    assert(V2_12_ECOSYSTEM_AUDIT_RECORDS.length >= 6, 'Ecosystem audit covers all subsystems');
    assert(V2_12_QUALITY_VECTORS.length === 12, '12 quality mitigation vectors covered');
  } catch (e: any) {
    assert(false, 'Platform Audit Matrix', e.message);
  }

  // 2. Universal Capture & Locked Vault Buffer
  try {
    universalCaptureEngine.clear();
    const env1 = universalCaptureEngine.createEnvelope({
      kind: 'text',
      text: 'Draft strategic initiative',
      sourceApp: 'Browser',
    });
    const env2 = universalCaptureEngine.createEnvelope({
      kind: 'text',
      text: 'Draft strategic initiative',
      sourceApp: 'Browser',
    });
    assert(env1.dedupeKey === env2.dedupeKey, 'Deterministic capture deduplication key generated');

    const ingestRes1 = universalCaptureEngine.ingest(env1, false);
    assert(ingestRes1.success === true, 'Capture successfully ingested');
    universalCaptureEngine.commitCapture(env1.id, 'res-capture-1');

    const ingestRes2 = universalCaptureEngine.ingest(env2, false);
    assert(ingestRes2.error !== undefined && ingestRes2.error.includes('Duplicate'), 'Duplicate capture rejected safely');

    // Locked vault buffer test
    const envLocked = universalCaptureEngine.createEnvelope({
      kind: 'url',
      url: 'https://example.com/spec.pdf',
    });
    const lockIngest = universalCaptureEngine.ingest(envLocked, true);
    assert(lockIngest.heldInLockedBuffer === true, 'Locked vault capture placed in memory buffer');
    assert(universalCaptureEngine.getLockedBufferSize() === 1, 'Locked buffer size is 1');

    const flushed = universalCaptureEngine.flushLockedBuffer();
    assert(flushed.length === 1 && flushed[0].id === envLocked.id, 'Locked buffer flushed on vault unlock');
    assert(universalCaptureEngine.getLockedBufferSize() === 0, 'Locked buffer emptied after flush');
  } catch (e: any) {
    assert(false, 'Universal Capture Engine', e.message);
  }

  // 3. Native File Integration Router & Path Traversal Sanitizer
  try {
    const dirty = '../../../../etc/passwd\0.md';
    const cleaned = nativeFileIntegrationRouter.sanitizeFilename(dirty);
    assert(!cleaned.includes('..') && !cleaned.includes('/') && cleaned.includes('passwd.md'), 'Path traversal sanitized safely');

    const appDrop = nativeFileIntegrationRouter.evaluateRouting(
      { name: 'external.md', size: 1024, type: 'text/markdown' },
      { isDroppedIntoNote: false }
    );
    assert(appDrop.requiresUserConfirmation === true && appDrop.action === 'import_to_vault', 'External file drop requires confirmation');

    const noteDrop = nativeFileIntegrationRouter.evaluateRouting(
      { name: 'figure1.png', size: 2048, type: 'image/png' },
      { isDroppedIntoNote: true, targetNoteId: 'note-42' }
    );
    assert(noteDrop.requiresUserConfirmation === false && noteDrop.action === 'attach_to_note', 'In-note drop attaches without dialog');

    const imgMd = nativeFileIntegrationRouter.formatAttachmentMarkdown('figure1.png', 'image', 'res-fig-1');
    assert(imgMd.trim() === '![figure1.png](app://media/res-fig-1)', 'Correct Markdown attachment embed format');
  } catch (e: any) {
    assert(false, 'Native File Router', e.message);
  }

  // 4. Desktop Menus & Action Registry Mapping
  try {
    const menus = nativeMenuActionBridge.generateNativeMenus({
      isVaultLocked: false,
      hasActiveNote: true,
      sidebarOpen: true,
      theme: 'dark',
      canUndo: true,
      canRedo: false,
    });
    assert(menus.length === 6, 'Desktop native menu generates all 6 standard categories');
    const fileMenu = menus.find(m => m.id === 'file');
    const newNoteItem = fileMenu?.items.find(i => i.id === 'file:new-note');
    assert(newNoteItem?.enabled === true, 'New Note enabled when vault is unlocked');

    const lockedMenus = nativeMenuActionBridge.generateNativeMenus({
      isVaultLocked: true,
      hasActiveNote: false,
      sidebarOpen: false,
      theme: 'dark',
      canUndo: false,
      canRedo: false,
    });
    const lockedFileMenu = lockedMenus.find(m => m.id === 'file');
    const lockedNewNote = lockedFileMenu?.items.find(i => i.id === 'file:new-note');
    assert(lockedNewNote?.enabled === false, 'New Note disabled when vault is locked');
  } catch (e: any) {
    assert(false, 'Desktop Menus Bridge', e.message);
  }

  // 5. Keyboard Shortcuts Normalizer & IME Safety
  try {
    const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
    const modString = keyboardShortcutsNormalizer.formatForPlatform('Mod+Shift+K');
    assert(isMac ? modString.includes('⌘') : modString.includes('Ctrl'), 'Modifier key correctly formatted for platform');

    const imeKey = {
      key: 'Enter',
      code: 'Enter',
      ctrlKey: true,
      metaKey: false,
      shiftKey: false,
      altKey: false,
      isComposing: true,
      keyCode: 229,
    } as unknown as KeyboardEvent;

    const matched = keyboardShortcutsNormalizer.matches(imeKey, 'Mod+Enter');
    assert(matched === false, 'Keyboard shortcut suppressed during IME composition');
  } catch (e: any) {
    assert(false, 'Keyboard Shortcuts Normalizer', e.message);
  }

  // 6. Desktop Lifecycle & Multi-Monitor Clamping
  try {
    const clamped = desktopLifecycleManager.clampBounds(
      { x: 4000, y: 3000, width: 2500, height: 2000 },
      { x: 0, y: 0, width: 1920, height: 1080 }
    );
    assert(clamped.width <= 1920 && clamped.height <= 1080 && clamped.x >= 0 && clamped.y >= 0, 'Offscreen window clamped within display bounds');

    desktopLifecycleManager.registerTempFile('/tmp/preview-decrypted.md');
    const cleaned = desktopLifecycleManager.cleanupTempFiles();
    assert(cleaned.includes('/tmp/preview-decrypted.md'), 'Registered temp files cleaned up on lifecycle exit');
  } catch (e: any) {
    assert(false, 'Desktop Lifecycle Manager', e.message);
  }

  // 7. Mobile Platform Bridge & Priority Back Stack
  try {
    const callStack: string[] = [];
    const unregLow = mobilePlatformBridge.registerBackHandler({
      id: 'history',
      priority: 10,
      handleBack: () => {
        callStack.push('low');
        return true;
      },
    });
    const unregHigh = mobilePlatformBridge.registerBackHandler({
      id: 'modal',
      priority: 100,
      handleBack: () => {
        callStack.push('high');
        return true;
      },
    });

    const handled = mobilePlatformBridge.dispatchBack();
    assert(handled === true, 'Back event handled');
    assert(callStack.length === 1 && callStack[0] === 'high', 'Highest priority back handler executed first');

    unregHigh();
    unregLow();

    const link = mobilePlatformBridge.parseDeepLink('keepnotes://note/note-777');
    assert(link?.action === 'open_note' && link?.resourceId === 'note-777', 'Deep link parsed correctly');

    const widgetLocked = mobilePlatformBridge.generateWidgetPayload({
      isVaultLocked: true,
      todayTaskCount: 5,
      completedTaskCount: 2,
      dueTaskSnippet: 'Secret project proposal',
    });
    assert(widgetLocked.status === 'locked' && !widgetLocked.subtitle.includes('Secret'), 'Widget payload masked during locked vault');
  } catch (e: any) {
    assert(false, 'Mobile Platform Bridge', e.message);
  }

  // 8. Tablet Multi-Pane Adaptive Layout
  try {
    const narrowLayout = tabletWorkflowEngine.computePaneLayout(500, 'research', true);
    assert(narrowLayout.columnsVisible === 1, 'Narrow width folds to 1 column');

    const triPaneLayout = tabletWorkflowEngine.computePaneLayout(1200, 'research', true);
    assert(triPaneLayout.columnsVisible === 3, 'Wide tablet provides 3-column tri-pane layout');
  } catch (e: any) {
    assert(false, 'Tablet Multi-Pane Engine', e.message);
  }

  // 9. Restrained Notifications & Safe Snooze
  try {
    const notif = restrainedNotificationOrchestrator.schedule({
      id: 'notif-pkm-1',
      category: 'tasks_reminders',
      resourceId: 'task-101',
      rawTitle: 'Confidential review',
      rawBody: 'Sign executive agreement',
      scheduledTime: Date.now() + 60000,
      originalDueTimestamp: 1780000000000,
    });

    const lockedMask = restrainedNotificationOrchestrator.maskPayload(notif, true);
    assert(!lockedMask.body.includes('Confidential'), 'Notification body masked in locked vault state');

    const snoozed = restrainedNotificationOrchestrator.executeSnoozeAction('notif-pkm-1', 30);
    assert(snoozed?.originalDueTimestamp === 1780000000000, 'Snoozing notification does NOT alter canonical due date');
  } catch (e: any) {
    assert(false, 'Restrained Notifications', e.message);
  }

  // 10. Plugin Lifecycle & Safe Mode Quarantine
  try {
    const manifest = {
      id: 'com.test.extension',
      name: 'Test Ext',
      version: '1.0.0',
      apiVersion: '2.0.0',
      description: 'Ext test',
      author: 'QA',
      permissions: ['storage' as const],
      entryPoint: 'index.js',
    };
    pluginEcosystemManager.installPlugin(manifest, ['storage']);

    const updateCheck = pluginEcosystemManager.stageUpdate('com.test.extension', {
      ...manifest,
      version: '1.1.0',
      permissions: ['storage', 'network', 'write_notes'],
    });
    assert(updateCheck.requiresUserReview === true, 'Permission escalation flags user review');
    assert(updateCheck.escalatedPermissions.includes('network'), 'Escalated permissions detected');

    pluginEcosystemManager.recordPluginCrash('com.test.extension', 'Fatal 1');
    pluginEcosystemManager.recordPluginCrash('com.test.extension', 'Fatal 2');
    pluginEcosystemManager.recordPluginCrash('com.test.extension', 'Fatal 3');
    const quarantined = pluginEcosystemManager.getPlugin('com.test.extension');
    assert(quarantined?.state === 'safe_mode_quarantined', 'Plugin quarantined into Safe Mode after 3 crashes');
  } catch (e: any) {
    assert(false, 'Plugin Ecosystem Manager', e.message);
  }

  // 11. Connector Maturity & Outage Containment
  try {
    connectorMaturityManager.reportProviderError('conn-readwise', '503 Service Unavailable', false);
    const conn = connectorMaturityManager.getConnector('conn-readwise');
    assert(conn?.status === 'needs_attention', 'External failure sets status to needs_attention without core crash');

    const reconnected = connectorMaturityManager.reconnectConnector('conn-readwise');
    assert(reconnected === true, 'One-click reconnect recovers connector');
  } catch (e: any) {
    assert(false, 'Connector Maturity Manager', e.message);
  }

  // 12. Everyday Workflow Friction Engine
  try {
    const benchmarks = everydayWorkflowFrictionEngine.getBenchmarks();
    assert(benchmarks.length === 10, 'Benchmarks cover all 10 core daily workflows');
    const avgSteps = everydayWorkflowFrictionEngine.calculateAverageSteps();
    const avgKeys = everydayWorkflowFrictionEngine.calculateAverageKeystrokes();
    assert(avgSteps <= 3.0, 'Average workflow steps <= 3.0');
    assert(avgKeys <= 5.0, 'Average keystrokes <= 5.0');
  } catch (e: any) {
    assert(false, 'Everyday Workflow Friction Engine', e.message);
  }

  // 13. Master V2.12 Certification Engine
  try {
    const cert = v2_12PlatformCertificationEngine.runCertification();
    if (!cert.passed) {
      console.error('Failed V2.12 gates:', cert.gates.filter(g => g.status === 'FAILED'));
    }
    assert(cert.passed === true, 'V2.12 certification PASSED');
    assert(cert.overallScore === 100, 'V2.12 overall certification score is 100%');
    assert(cert.gates.length === 14, 'All 14 mandatory release gates evaluated');
    assert(cert.summary.failedGates === 0, 'Zero failed release gates');
  } catch (e: any) {
    assert(false, 'V2.12 Platform Certification Engine', e.message);
  }

  return { passed, failed, errors };
}
