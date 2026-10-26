/**
 * V2.11 Master Maintenance Ledger
 * 
 * Tracks all post-launch maintenance issues, bug fixes, security patches,
 * and operational hardening items with complete audit trails.
 */

import { PostLaunchIssue, postLaunchIssueModel } from './postLaunchIssueModel';

export const INITIAL_MAINTENANCE_LEDGER_ENTRIES: PostLaunchIssue[] = [
  {
    id: 'MNT-001',
    title: 'Atomic Journal Replay on Sudden Process Termination',
    firstAffectedVersion: '2.10.0',
    affectedFeature: 'Data Storage & IndexedDB Engine',
    severity: 'S0',
    incidentClass: 'Data Integrity Incident',
    dimensions: {
      isReproducible: true,
      hasDataRisk: true,
      hasSecurityRisk: false,
      isPlatformSpecific: false,
      isMigrationRelated: false,
      isPluginRelated: false,
      isConnectorRelated: false,
      isPerformanceRelated: false,
      isRecoveryAvailable: true,
      recoveryMechanism: 'Automated startup journal replay clears incomplete temporary staging buffers',
    },
    reproductionSteps: [
      'Simulate abrupt SIGKILL / process death mid-transaction during 50-note bulk update',
      'Restart application and inspect database consistency',
    ],
    rootCause: 'Partial transaction commit could leave staging markers without final swap pointer.',
    affectsStableContract: false,
    requiresMigration: false,
    fixDescription: 'Implemented two-phase commit protocol with write-ahead journal check at boot.',
    regressionTestId: 'test_journal_replay_on_sudden_kill',
    requiresBackport: true,
    finalState: 'Fixed',
  },
  {
    id: 'MNT-002',
    title: 'Defensive Plugin Compatibility Layer for V2.10 Plugins on V2.11 Runtime',
    firstAffectedVersion: '2.10.0',
    affectedFeature: 'Extension & Plugin Sandbox',
    severity: 'S1',
    incidentClass: 'Compatibility Incident',
    dimensions: {
      isReproducible: true,
      hasDataRisk: false,
      hasSecurityRisk: false,
      isPlatformSpecific: false,
      isMigrationRelated: false,
      isPluginRelated: true,
      isConnectorRelated: false,
      isPerformanceRelated: false,
      isRecoveryAvailable: true,
      recoveryMechanism: 'Plugin Safe Mode isolates crashes and preserves stored plugin configurations',
    },
    reproductionSteps: [
      'Load V2.10 plugin manifest containing deprecated configuration hooks into V2.11',
      'Execute plugin event dispatch loop',
    ],
    rootCause: 'Missing forward-shim for optional metadata fields caused uncaught worker exception.',
    affectsStableContract: false,
    requiresMigration: false,
    fixDescription: 'Added defensive proxy shim in WebWorker sandbox with graceful fallback for deprecated hooks.',
    regressionTestId: 'test_v2_10_plugin_compatibility_shim',
    requiresBackport: false,
    finalState: 'Fixed',
  },
  {
    id: 'MNT-003',
    title: 'Truthful Save Status Reporter with Memory Queue on Storage Quota Exhaustion',
    firstAffectedVersion: '2.10.0',
    affectedFeature: 'Editor & Storage Persistence',
    severity: 'S0',
    incidentClass: 'Data Integrity Incident',
    dimensions: {
      isReproducible: true,
      hasDataRisk: true,
      hasSecurityRisk: false,
      isPlatformSpecific: false,
      isMigrationRelated: false,
      isPluginRelated: false,
      isConnectorRelated: false,
      isPerformanceRelated: false,
      isRecoveryAvailable: true,
      recoveryMechanism: 'Memory queue preserves active edits and offers 1-click vault export/cache purge',
    },
    reproductionSteps: [
      'Simulate IndexedDB QuotaExceededError while typing in Markdown note',
      'Verify UI save state indication and in-memory buffer',
    ],
    rootCause: 'UI showed optimistic "Saved" badge before disk transaction confirmed completion.',
    affectsStableContract: false,
    requiresMigration: false,
    fixDescription: 'Decoupled UI save indicator from memory state; only displays "Saved" upon disk flush confirmation.',
    regressionTestId: 'test_truthful_save_status_on_quota_error',
    requiresBackport: true,
    finalState: 'Fixed',
  },
  {
    id: 'MNT-004',
    title: 'Graceful Error Boundary & Safe Mode for Corrupted Workspace Layout Preferences',
    firstAffectedVersion: '2.10.0',
    affectedFeature: 'User Settings & Workspace Layout',
    severity: 'S2',
    incidentClass: 'UX Regression',
    dimensions: {
      isReproducible: true,
      hasDataRisk: false,
      hasSecurityRisk: false,
      isPlatformSpecific: false,
      isMigrationRelated: false,
      isPluginRelated: false,
      isConnectorRelated: false,
      isPerformanceRelated: false,
      isRecoveryAvailable: true,
      recoveryMechanism: 'Reset Layout Only button safely restores default panels without touching note data',
    },
    reproductionSteps: [
      'Inject malformed JSON into localStorage workspace layout key',
      'Boot application and observe shell rendering',
    ],
    rootCause: 'Unchecked JSON.parse on layout preferences caused top-level shell render crash.',
    affectsStableContract: false,
    requiresMigration: false,
    fixDescription: 'Wrapped all preference parsing in typed schema validators with automatic fallback to default layout.',
    regressionTestId: 'test_corrupt_settings_fallback',
    requiresBackport: false,
    finalState: 'Fixed',
  },
  {
    id: 'MNT-005',
    title: 'Direct Multi-Patch Version Skipping (V2.10.0 -> V2.10.3) Without Intermediate Steps',
    firstAffectedVersion: '2.10.0',
    affectedFeature: 'Patch Release & Migration Engine',
    severity: 'S1',
    incidentClass: 'Compatibility Incident',
    dimensions: {
      isReproducible: true,
      hasDataRisk: false,
      hasSecurityRisk: false,
      isPlatformSpecific: false,
      isMigrationRelated: true,
      isPluginRelated: false,
      isConnectorRelated: false,
      isPerformanceRelated: false,
      isRecoveryAvailable: true,
      recoveryMechanism: 'Cumulative migration executor runs all stepped migrations in sequential atomic transaction',
    },
    reproductionSteps: [
      'Initialize V2.10.0 vault, skip V2.10.1 and V2.10.2, and launch directly in V2.10.3 / V2.11.0',
      'Verify schema version, index state, and resource integrity',
    ],
    rootCause: 'Assumption that users would sequentially boot each intermediate patch release.',
    affectsStableContract: false,
    requiresMigration: true,
    fixDescription: 'Engineered cumulative migration chain that evaluates current vs target versions and executes step-by-step.',
    regressionTestId: 'test_multi_patch_skipping_chain',
    requiresBackport: false,
    finalState: 'Fixed',
  },
  {
    id: 'MNT-006',
    title: 'Connector Auth Expiration & Schema Deviation Isolation',
    firstAffectedVersion: '2.10.0',
    affectedFeature: 'External Connectors & Integrations',
    severity: 'S2',
    incidentClass: 'Availability Incident',
    dimensions: {
      isReproducible: true,
      hasDataRisk: false,
      hasSecurityRisk: false,
      isPlatformSpecific: false,
      isMigrationRelated: false,
      isPluginRelated: false,
      isConnectorRelated: true,
      isPerformanceRelated: false,
      isRecoveryAvailable: true,
      recoveryMechanism: 'Connector pause with re-authorization prompt; cached notes remain fully accessible',
    },
    reproductionSteps: [
      'Simulate 401 Unauthorized or unknown field returned from external calendar connector',
      'Observe core note editor and connector status badge',
    ],
    rootCause: 'Unhandled HTTP status propagated up to main sync coordinator.',
    affectsStableContract: false,
    requiresMigration: false,
    fixDescription: 'Isolated connector fetch operations in circuit breaker that pauses sync and notifies via Attention center.',
    regressionTestId: 'test_connector_auth_failure_isolation',
    requiresBackport: false,
    finalState: 'Fixed',
  },
  {
    id: 'MNT-007',
    title: 'Background Derived Index Rebuild on Format Upgrade Without Vault Lock',
    firstAffectedVersion: '2.10.0',
    affectedFeature: 'Search & Graph Derived Indexers',
    severity: 'S1',
    incidentClass: 'Performance Incident',
    dimensions: {
      isReproducible: true,
      hasDataRisk: false,
      hasSecurityRisk: false,
      isPlatformSpecific: false,
      isMigrationRelated: false,
      isPluginRelated: false,
      isConnectorRelated: false,
      isPerformanceRelated: true,
      isRecoveryAvailable: true,
      recoveryMechanism: 'Lightweight metadata search fallback while derived index rebuilds in idle slices',
    },
    reproductionSteps: [
      'Bump derived search index version tag',
      'Launch application and immediately execute search queries',
    ],
    rootCause: 'Synchronous index migration blocked main UI thread on vaults with 10k+ notes.',
    affectsStableContract: false,
    requiresMigration: false,
    fixDescription: 'Moved index rebuilding to asynchronous background worker with atomic swap upon completion.',
    regressionTestId: 'test_derived_index_background_rebuild',
    requiresBackport: false,
    finalState: 'Fixed',
  },
  {
    id: 'MNT-008',
    title: 'Sanitized Support Diagnostic Generator with Cryptographic Redaction',
    firstAffectedVersion: '2.10.0',
    affectedFeature: 'Production Diagnostics & Support Hub',
    severity: 'S1',
    incidentClass: 'Security Incident',
    dimensions: {
      isReproducible: true,
      hasDataRisk: false,
      hasSecurityRisk: true,
      isPlatformSpecific: false,
      isMigrationRelated: false,
      isPluginRelated: false,
      isConnectorRelated: false,
      isPerformanceRelated: false,
      isRecoveryAvailable: true,
      recoveryMechanism: 'User preview modal allows inspecting exact redacted JSON prior to clipboard copy or export',
    },
    reproductionSteps: [
      'Generate diagnostic support snapshot on vault containing sensitive notes and credentials',
      'Audit generated JSON for private strings or note body text',
    ],
    rootCause: 'Raw error logs occasionally captured query string fragments containing search terms.',
    affectsStableContract: false,
    requiresMigration: false,
    fixDescription: 'Built deterministic regex and AST sanitizer that scrubs titles, bodies, tokens, and query strings.',
    regressionTestId: 'test_support_snapshot_redaction',
    requiresBackport: false,
    finalState: 'Fixed',
  },
];

export class MaintenanceLedgerService {
  private static instance: MaintenanceLedgerService;
  private entries: Map<string, PostLaunchIssue> = new Map();

  constructor() {
    INITIAL_MAINTENANCE_LEDGER_ENTRIES.forEach((entry) => {
      this.entries.set(entry.id, entry);
    });
  }

  public static getInstance(): MaintenanceLedgerService {
    if (!MaintenanceLedgerService.instance) {
      MaintenanceLedgerService.instance = new MaintenanceLedgerService();
    }
    return MaintenanceLedgerService.instance;
  }

  public getAll(): PostLaunchIssue[] {
    return Array.from(this.entries.values());
  }

  public getById(id: string): PostLaunchIssue | undefined {
    return this.entries.get(id);
  }

  public addOrUpdate(issue: PostLaunchIssue): { success: boolean; errors: string[] } {
    const validation = postLaunchIssueModel.validateIssue(issue);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }
    this.entries.set(issue.id, issue);
    return { success: true, errors: [] };
  }

  public getSummary() {
    const all = this.getAll();
    const s0Count = all.filter((i) => i.severity === 'S0' && i.finalState !== 'Fixed').length;
    const s1Count = all.filter((i) => i.severity === 'S1' && i.finalState !== 'Fixed').length;
    const fixedCount = all.filter((i) => i.finalState === 'Fixed').length;

    return {
      totalEntries: all.length,
      s0Count,
      s1Count,
      fixedCount,
      isMaintenanceReady: s0Count === 0 && s1Count === 0,
    };
  }
}

export const maintenanceLedger = MaintenanceLedgerService.getInstance();
