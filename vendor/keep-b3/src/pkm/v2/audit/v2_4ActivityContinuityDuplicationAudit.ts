/**
 * PKM V2.4 — Activity, Attention, Review & Continuity Duplication Audit
 *
 * Systematic inventory and consolidation plan across all historical and current
 * systems that track activity, revisions, attention, history, and continuity.
 */

export interface ActivitySystemInventoryItem {
  system: string;
  purpose: string;
  historyType: 'canonical_domain' | 'resource_revisions' | 'semantic_activity' | 'reliability_audit' | 'navigation_history';
  canonical: boolean;
  derived: boolean;
  retention: string;
  sensitive: boolean;
  synced: boolean;
  userVisible: boolean;
  recoveryRelated: boolean;
  canRebuild: boolean;
  consolidationTarget: string;
}

export const V2_4_ACTIVITY_SYSTEMS_INVENTORY: ActivitySystemInventoryItem[] = [
  {
    system: 'P24 Flashback / Historical Discovery',
    purpose: 'Surface past notes on anniversary/date boundaries',
    historyType: 'semantic_activity',
    canonical: false,
    derived: true,
    retention: 'Derived query over canonical resource dates',
    sensitive: true,
    synced: false,
    userVisible: true,
    recoveryRelated: false,
    canRebuild: true,
    consolidationTarget: 'Unified Temporal Query / Activity Index',
  },
  {
    system: 'P29 Revision Engine / Recovery Journal',
    purpose: 'Provide point-in-time content rollbacks and crash recovery',
    historyType: 'resource_revisions',
    canonical: false,
    derived: false,
    retention: 'Bounded LRU / differential revision tree',
    sensitive: true,
    synced: true,
    userVisible: true,
    recoveryRelated: true,
    canRebuild: false,
    consolidationTarget: 'Keep isolated as dedicated Revision Recovery subsystem; link via Resource History',
  },
  {
    system: 'P37 Timeline / Activity Log',
    purpose: 'V1-era raw event stream of actions',
    historyType: 'semantic_activity',
    canonical: false,
    derived: false,
    retention: 'Unbounded log with potential autosave noise',
    sensitive: true,
    synced: true,
    userVisible: true,
    recoveryRelated: false,
    canRebuild: false,
    consolidationTarget: 'Consolidate into V2.4 Semantic Activity Engine with session coalescing & deduplication',
  },
  {
    system: 'P49 Review Engine & Snapshots',
    purpose: 'Periodic reflection records and weekly/monthly planning',
    historyType: 'canonical_domain',
    canonical: true,
    derived: false,
    retention: 'Permanent canonical markdown notes with frozen evidence snapshot metadata',
    sensitive: false,
    synced: true,
    userVisible: true,
    recoveryRelated: false,
    canRebuild: false,
    consolidationTarget: 'V2.3/V2.4 Review Engine with immutable snapshot evidence',
  },
  {
    system: 'P50 Tracking & Sensor Events',
    purpose: 'High-frequency telemetry (habits, metrics, measurements)',
    historyType: 'canonical_domain',
    canonical: true,
    derived: false,
    retention: 'Permanent domain records',
    sensitive: true,
    synced: true,
    userVisible: true,
    recoveryRelated: false,
    canRebuild: false,
    consolidationTarget: 'Keep canonical within tracking domain; emit coalesced batch activity instead of raw event floods',
  },
  {
    system: 'P59 Context / What Changed / Attention Lens',
    purpose: 'Determine delta changes since last visit and surface urgent items',
    historyType: 'semantic_activity',
    canonical: false,
    derived: true,
    retention: 'Cursor-based checkpoint store',
    sensitive: false,
    synced: true,
    userVisible: true,
    recoveryRelated: false,
    canRebuild: true,
    consolidationTarget: 'V2.4 WhatChangedEngine & Unified Attention Engine',
  },
  {
    system: 'V2 Action System Undo Journal',
    purpose: 'In-memory stack for user action reversal',
    historyType: 'reliability_audit',
    canonical: false,
    derived: false,
    retention: 'Session-only in-memory stack (30 actions)',
    sensitive: true,
    synced: false,
    userVisible: false,
    recoveryRelated: true,
    canRebuild: false,
    consolidationTarget: 'Keep isolated in UndoFoundationV2',
  },
  {
    system: 'V2.3 Routine Runs & Workflow History',
    purpose: 'Track completions of daily and weekly routine executions',
    historyType: 'canonical_domain',
    canonical: true,
    derived: false,
    retention: 'Permanent domain records',
    sensitive: false,
    synced: true,
    userVisible: true,
    recoveryRelated: false,
    canRebuild: false,
    consolidationTarget: 'V2.3 RoutineEngineV2 with semantic activity emission',
  },
  {
    system: 'V2.3 Automation Execution Logs',
    purpose: 'Audit logs for rule evaluation, trigger fires, and error prevention',
    historyType: 'reliability_audit',
    canonical: false,
    derived: false,
    retention: 'Bounded FIFO (200 entries)',
    sensitive: false,
    synced: false,
    userVisible: true,
    recoveryRelated: false,
    canRebuild: false,
    consolidationTarget: 'Keep bounded in AutomationEngineV2',
  },
  {
    system: 'Device-Local Navigation Stack',
    purpose: 'Recently viewed items, forward/back history, scroll positions',
    historyType: 'navigation_history',
    canonical: false,
    derived: true,
    retention: 'Ephemeral local browser state',
    sensitive: false,
    synced: false,
    userVisible: true,
    recoveryRelated: false,
    canRebuild: true,
    consolidationTarget: 'V2.4 ContinuityEngine device-local UI state',
  },
];
