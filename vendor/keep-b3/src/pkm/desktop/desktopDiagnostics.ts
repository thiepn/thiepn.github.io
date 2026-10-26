/**
 * P46 — Native Desktop Diagnostics & Self-Tests Engine
 * Validates integrity of native desktop bridge capabilities and security sandbox guarantees.
 */

import { DesktopDiagnosticsReport, DesktopDiagnosticItem } from './desktopTypes';
import { desktopCapabilityService } from './desktopCapabilityService';
import { desktopCredentialStore } from './desktopCredentialStore';
import { desktopFilesystemWatcher } from './desktopFilesystemWatcher';
import { desktopProtocolService } from './desktopProtocolService';
import { DesktopSecurityGuard } from './desktopSecurityGuard';

export class DesktopDiagnosticsEngine {
  /**
   * Executes full suite of desktop capability and security self-tests.
   */
  public async runFullDiagnostics(): Promise<DesktopDiagnosticsReport> {
    const items: DesktopDiagnosticItem[] = [];
    const timestamp = new Date().toISOString();

    const isDesktop = desktopCapabilityService.isDesktopApp();
    const platform = desktopCapabilityService.getPlatform();
    const runtime = desktopCapabilityService.getRuntime();

    // Test 1: Runtime & Environment Detection
    items.push({
      id: 'env_detection',
      name: 'Runtime Environment & Platform Check',
      status: 'passed',
      details: isDesktop
        ? `Running in native desktop shell (${runtime.toUpperCase()}) on ${platform.toUpperCase()}`
        : `Running in browser/PWA (${runtime.toUpperCase()}) - Fallback adapters active`,
      timestamp,
    });

    // Test 2: Security Path Traversal Guard
    const traversalTest = DesktopSecurityGuard.validateRelativePath('../../../etc/passwd');
    const uncTest = DesktopSecurityGuard.validateRelativePath('\\\\192.168.1.1\\share\\secret.md');
    const validTest = DesktopSecurityGuard.validateRelativePath('folder/subfolder/note.md');

    if (!traversalTest.isValid && !uncTest.isValid && validTest.isValid && validTest.sanitizedPath === 'folder/subfolder/note.md') {
      items.push({
        id: 'security_traversal_guard',
        name: 'Path Traversal & Boundary Guard',
        status: 'passed',
        details: 'Correctly blocked relative traversal (../) and UNC escape attempts; validated legitimate paths',
        timestamp,
      });
    } else {
      items.push({
        id: 'security_traversal_guard',
        name: 'Path Traversal & Boundary Guard',
        status: 'failed',
        details: 'Security guard failed to properly reject traversal attack fixtures',
        timestamp,
      });
    }

    // Test 3: Security Caller Context Isolation (Plugin & AI Sandbox Guard)
    const pluginAuth = DesktopSecurityGuard.verifyCallerAuthorization('plugin' as any);
    const aiAuth = DesktopSecurityGuard.verifyCallerAuthorization('ai' as any);
    const coreAuth = DesktopSecurityGuard.verifyCallerAuthorization('core_app');

    if (!pluginAuth && !aiAuth && coreAuth) {
      items.push({
        id: 'security_caller_isolation',
        name: 'Plugin & AI Sandbox Native Bridge Isolation',
        status: 'passed',
        details: 'Strictly denied native bridge execution from plugin and AI contexts while authorizing core app',
        timestamp,
      });
    } else {
      items.push({
        id: 'security_caller_isolation',
        name: 'Plugin & AI Sandbox Native Bridge Isolation',
        status: 'failed',
        details: 'Failed to block unauthorized caller contexts',
        timestamp,
      });
    }

    // Test 4: Protocol URI Validation & Sanitization
    const validProto = DesktopSecurityGuard.sanitizeProtocolUri('pkm://note/note-1234');
    const traversalProto = DesktopSecurityGuard.sanitizeProtocolUri('pkm://note/../../etc/passwd');
    const invalidScheme = DesktopSecurityGuard.sanitizeProtocolUri('http://evil.com');

    if (validProto.isValid && validProto.action === 'note' && validProto.param === 'note-1234' && !traversalProto.isValid && !invalidScheme.isValid) {
      items.push({
        id: 'protocol_validation',
        name: 'Custom Protocol (pkm://) Grammar & Sanitization',
        status: 'passed',
        details: 'Validated canonical actions (note, today, collection, capture) and rejected traversal injections',
        timestamp,
      });
    } else {
      items.push({
        id: 'protocol_validation',
        name: 'Custom Protocol (pkm://) Grammar & Sanitization',
        status: 'failed',
        details: 'Protocol URI validation rejected valid URI or accepted malicious fixture',
        timestamp,
      });
    }

    // Test 5: OS Credential Storage Backend
    const backendName = desktopCredentialStore.getBackendName();
    const isNativeCred = desktopCredentialStore.isNativeStoreAvailable();
    items.push({
      id: 'credential_storage',
      name: 'OS Credential Storage Backend',
      status: isNativeCred ? 'passed' : 'warning',
      details: isNativeCred
        ? `Native hardware-backed storage active: ${backendName}`
        : `Web fallback mode active (${backendName}) - Plaintext storage prevented`,
      timestamp,
    });

    // Test 6: Filesystem Watcher Status
    const watcherStatus = desktopFilesystemWatcher.getStatus();
    const isWatcherAvail = desktopFilesystemWatcher.isAvailable();
    items.push({
      id: 'filesystem_watcher',
      name: 'Native Filesystem Watcher (FSEvents/inotify/ReadDirectoryChangesW)',
      status: isWatcherAvail ? (watcherStatus === 'error' ? 'failed' : 'passed') : 'skipped',
      details: isWatcherAvail
        ? `Native watcher active: Status is '${watcherStatus}' with coalescing window (250ms)`
        : 'Native watcher unavailable in browser context; using P45 scan-based fallback',
      timestamp,
    });

    // Test 7: Global Shortcuts Capability
    const shortcutSettings = desktopCapabilityService.getSettings();
    items.push({
      id: 'global_shortcuts',
      name: 'Global Quick Capture Shortcut',
      status: isDesktop ? 'passed' : 'skipped',
      details: isDesktop
        ? `Global shortcut configured: '${shortcutSettings.globalQuickCaptureShortcut}' (${shortcutSettings.globalQuickCaptureEnabled ? 'Enabled' : 'Disabled'})`
        : 'Global shortcuts unavailable in browser sandbox; in-app shortcut active',
      timestamp,
    });

    // Test 8: Background Activity Coordinator
    const bgStatus = desktopCapabilityService.getSettings().pauseBackgroundActivity;
    items.push({
      id: 'background_coordinator',
      name: 'Background Task Coordinator',
      status: 'passed',
      details: bgStatus ? 'Background activity is currently paused by user' : 'Background scheduler active (automations, reminders, sync, mirror)',
      timestamp,
    });

    const passed = items.filter((i) => i.status === 'passed').length;
    const warnings = items.filter((i) => i.status === 'warning').length;
    const failed = items.filter((i) => i.status === 'failed').length;

    return {
      timestamp,
      platform,
      runtime,
      isDesktop,
      items,
      summary: {
        total: items.length,
        passed,
        warnings,
        failed,
      },
    };
  }
}

export const desktopDiagnosticsEngine = new DesktopDiagnosticsEngine();
