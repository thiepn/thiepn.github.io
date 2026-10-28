/**
 * PKM V2 Foundation & V2.2 Unified Views & Query Exports
 */

export * from './core/resource/resourceCore';
export * from './core/resource/resourceRegistry';
export * from './core/resource/resourceCapabilities';

export * from './core/connections/connectionTypes';
export * from './core/connections/connectionIndex';

export * from './core/query/queryTypes';
export * from './core/query/fieldRegistry';
export * from './core/query/filterOperators';
export * from './core/query/unifiedQueryEngine';

export * from './views/savedViewTypes';
export * from './views/savedViewRegistry';
export * from './views/UnifiedFilterBuilder';
export * from './views/UnifiedListView';
export * from './views/UnifiedTableView';
export * from './views/UnifiedBoardView';
export * from './views/UnifiedCalendarView';
export * from './views/UnifiedGalleryView';
export * from './views/UnifiedViewContainer';

export * from './collections/v2CollectionTypes';
export * from './collections/v2CollectionRegistry';

export * from './bulk/unifiedBulkActions';
export * from './bulk/BulkActionToolbar';

export * from './core/modules/moduleContract';
export * from './core/modules/moduleRegistry';
export * from './core/modules/coreModules';
export * from './core/modules/domainModules';

export * from './core/actions/actionTypes';
export * from './core/actions/undoFoundation';
export * from './core/actions/actionSystem';

export * from './migration/migrationTypes';
export * from './migration/migrationVerifier';
export * from './migration/v1ToV2MigrationEngine';

export * from './compat/v1CompatibilityBridge';
export * from './compat/v1PluginCompat';

export * from './actions/standardV2Actions';
export * from './shell/ResourceActionMenu';
export * from './shell/ResourceHeaderV2';
export * from './shell/ResourceShellV2';
export * from './connections/UnifiedConnectionsPanel';
export * from './inspector/UnifiedResourceInspector';
export * from './creation/UnifiedCreateModal';
export * from './creation/UnifiedRelationPicker';
export * from './home/UnifiedHomeView';
export * from './context/UnifiedContextBar';
export {
  UnifiedContextView,
  type UnifiedContextViewProps,
  type V2WorkingSetItem,
  type ContextQuickAction,
} from './context/UnifiedContextView';
export * from './modules/UnifiedModuleLanding';
export * from './settings/ModuleDisclosureManager';
export * from './navigation/UnifiedBottomNav';

export * from './ui/V2MigrationModal';
export * from './ui/V2ConnectionsPanel';
export * from './ui/V2ModuleLauncher';
export * from './ui/V2ObservatoryTab';

export * from './audit/v2_2QueryDuplicationAudit';
export * from './audit/v2_2PerformanceBenchmarks';

// V2.3 Temporal, Workflows, Planning & Review Systems
export {
  type DateOnlyString,
  type DateTimeString,
  type TemporalFieldType,
  type TemporalProjection,
  type RecurrenceFrequencyV2,
  type Weekday,
  type MonthEndPolicy,
  type AdvancePolicy,
  type RecurrenceRuleV2,
  type OccurrenceInstance,
  type AgendaDaySection,
  generateOccurrenceId,
} from './temporal/temporalTypes';

export {
  computeNextOccurrenceDateV2,
  expandRecurrenceInstancesInWindow,
  isValidDateOnly,
  createSafeDate,
  formatSafeDate,
  getTodayDateOnly,
  addDaysDateOnly,
  isLeapYear as isLeapYearV2,
  getDaysInMonth as getDaysInMonthV2,
} from './temporal/recurrenceEngineV2';

export * from './temporal/temporalIndex';
export * from './temporal/todayEngineV2';
export * from './temporal/agendaEngineV2';

export * from './workflows/workflowTypes';
export * from './workflows/actionSequenceExecutor';
export * from './workflows/routineEngineV2';
export * from './workflows/automationEngineV2';

export * from './planning/planningTypes';
export * from './planning/planTodayWorkflow';
export * from './planning/aiPlanProposal';

export * from './review/reviewTypesV2';
export * from './review/reviewEngineV2';

export * from './reminders/reminderEngineV2';

export * from './audit/v2_3WorkflowTemporalDuplicationAudit';

// V2.4 Activity, Attention, Review & Continuity Systems
export * from './activity';
export * from './continuity';
export * from './attention';
export * from './history';
export * from './lifecycle';
export * from './review';

export * from './ui/ActivityTimelineView';
export * from './ui/WhatChangedPanel';
export * from './ui/AttentionCenterModal';
export * from './ui/ContinueCard';
export * from './ui/ResourceHistoryTab';

export * from './audit/v2_4ActivityContinuityDuplicationAudit';
export * from './audit/v2_5SyncContinuityAudit';
export * from './audit/v2_6BackupStorageAudit';
export * from './audit/v2_7PerformanceAudit';

// V2.7 Extreme-Scale Performance, Runtime Efficiency & Platform Optimization
export * from './performance';

// V2.8 Security, Privacy, Trust Boundaries & Adversarial Hardening
export * from './security';
export * from './audit/v2_8SecurityAudit';
export * from './audit/v2_8CertificationReport';
export * from './ui/SecurityDiagnosticsModalV2';

// V2.12 Native Platform & Ecosystem Quality
export * from './ecosystem';
export * from './ui/V2PlatformEcosystemModal';

// V2.17 Knowledge Work Excellence & Research Depth
export * from './knowledge';

// V2.18 Global Usability, Accessibility, Localization & Content Fidelity
export * from './globalization';

// V2.19 Dashboards, Reporting, Trends & Decision-Support Excellence
export * from './reporting';

// V2.20 Automation, Scheduling, Recurrence & Proactive Workflow Excellence
export * from './automation';
export * from './ui/V2AutomationCenterModal';

// V2.21 Core Experience Completion
export * from './coreExperience/v2_21CoreExperienceEngine';
export * from './ui/V2CoreExperienceCenterModal';

// V2.22 Personal OS Feature Completion
export * from './domains/v2_22PersonalOSEngine';
export * from './ui/V2PersonalOSCenterModal';

// V2.23 Automation, Intelligence & Reporting Unified Engine
export * from './intelligence/v2_23IntelligenceEngine';
export * from './ui/V2UnifiedIntelligenceCenterModal';

// V2.24 Ecosystem & Data Interoperability Unified Engine
export * from './interoperability/v2_24InteroperabilityEngine';
export * from './ui/V2UnifiedInteroperabilityCenterModal';

// V2.25 Platform & Feature Completion Freeze
export * from './release';
export * from './ui/V2PlatformFeatureFreezeModal';

// V2.26 Full-System Audit & Blocker Elimination
export * from './audit/v2_26HardeningScopeGate';
export * from './audit/v2_26MasterBlockerLedger';
export * from './audit/v2_26AuditEngine';
export * from './audit/v2_26HandoffLedgers';
export * from './ui/V2BlockerEliminationModal';

// V2.27 Reliability, Security & Data Integrity Hardening
export * from './hardening/v2_27ScopeGate';
export * from './hardening/v2_27DataIntegrityEngine';
export * from './hardening/v2_27RecoveryJournal';
export * from './hardening/v2_27SyncHardeningEngine';
export * from './hardening/v2_27DisasterRecoveryEngine';
export * from './hardening/v2_27MigrationHardeningEngine';
export * from './hardening/v2_27SecurityHardeningEngine';
export * from './hardening/v2_27AdversarialHarness';
export * from './hardening/v2_27HardeningLedger';
export * from './ui/V2ReliabilitySecurityModal';

// V2.28 Performance, Accessibility & Platform Hardening
export * from './hardening/v2_28ScopeGate';
export * from './hardening/v2_28PerformanceHardeningEngine';
export * from './hardening/v2_28AccessibilityHardeningEngine';
export * from './hardening/v2_28InputGlobalizationHardeningEngine';
export * from './hardening/v2_28PlatformHardeningEngine';
export * from './hardening/v2_28HardeningLedger';
export * from './ui/V2PerformanceAccessibilityModal';

// V2.29 Release Candidate 1
export * from './rc1/v2_29ScopeGate';
export * from './rc1/v2_29ArtifactManifestEngine';
export * from './rc1/v2_29ReleaseCandidateCertificationEngine';
export * from './rc1/v2_29RCLedger';
export * from './ui/V2ReleaseCandidate1Modal';

// V2.30 Release Candidate 2 -> Stable Ship & Full Product Audit
export * from './stable/v2_30ScopeGate';
export * from './stable/v2_30StableArtifactManifestEngine';
export * from './stable/v2_30StableCertificationEngine';
export * from './stable/v2_30StableLedger';
export * from './stable/v2StableFullAuditEngine';
export * from './ui/V2StableShipModal';

