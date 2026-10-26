/**
 * V2.26 Hardening Scope Gate & Authoritative Policy Validator
 * 
 * Enforces the strict V2.25 Feature Freeze contract and classifies all discovered
 * items into authoritative hardening classifications.
 * 
 * Invariants:
 * - NO NEW FEATURES permitted after V2.25.
 * - Every candidate item must be classified prior to code modification.
 * - All feature requests are permanently classified as FEATURE REQUEST — REJECT.
 */

export type HardeningClassification =
  | 'S0_CATASTROPHIC_BLOCKER'
  | 'S1_RELEASE_BLOCKER'
  | 'S2_SIGNIFICANT_DEFECT'
  | 'S3_MINOR_DEFECT_POLISH'
  | 'HARDENING_V2_27_OR_V2_28'
  | 'PLATFORM_LIMITATION'
  | 'DOCUMENTATION_DEFECT'
  | 'FEATURE_REQUEST_REJECT'
  | 'INVALID_NOT_REPRODUCIBLE';

export interface ScopeGateItem {
  id: string;
  title: string;
  description: string;
  sourceArea: string;
  reportedBy: string;
  classification: HardeningClassification;
  isNewFeature: boolean;
  justification: string;
  admittedToV2_26: boolean;
}

export class V2_26HardeningScopeGate {
  private static instance: V2_26HardeningScopeGate;
  private readonly items: Map<string, ScopeGateItem> = new Map();

  private constructor() {
    this.seedInitialScopeGateEvaluations();
  }

  public static getInstance(): V2_26HardeningScopeGate {
    if (!V2_26HardeningScopeGate.instance) {
      V2_26HardeningScopeGate.instance = new V2_26HardeningScopeGate();
    }
    return V2_26HardeningScopeGate.instance;
  }

  /**
   * Evaluates a candidate finding or request against the strict V2.25 Feature Freeze rules.
   */
  public evaluateCandidate(item: Omit<ScopeGateItem, 'admittedToV2_26'>): ScopeGateItem {
    // Hard Rule 1: Zero Feature Requests post-freeze
    if (item.isNewFeature || item.classification === 'FEATURE_REQUEST_REJECT') {
      const rejected: ScopeGateItem = {
        ...item,
        classification: 'FEATURE_REQUEST_REJECT',
        isNewFeature: true,
        admittedToV2_26: false,
        justification: `REJECTED: Feature development is permanently frozen as of V2.25. "${item.title}" changes product scope.`,
      };
      this.items.set(rejected.id, rejected);
      return rejected;
    }

    // Hard Rule 2: Admitted blocker/defect fix
    const isAdmitted =
      item.classification === 'S0_CATASTROPHIC_BLOCKER' ||
      item.classification === 'S1_RELEASE_BLOCKER' ||
      item.classification === 'S2_SIGNIFICANT_DEFECT' ||
      item.classification === 'S3_MINOR_DEFECT_POLISH' ||
      item.classification === 'DOCUMENTATION_DEFECT';

    const evaluated: ScopeGateItem = {
      ...item,
      admittedToV2_26: isAdmitted,
      justification: isAdmitted
        ? `ADMITTED: Restores existing frozen specification without expanding feature footprint.`
        : `DEFERRED TO SPECIALIST HARDENING: Belongs to V2.27 (Reliability/Security) or V2.28 (Performance/A11y).`,
    };

    this.items.set(evaluated.id, evaluated);
    return evaluated;
  }

  public getAllEvaluations(): ScopeGateItem[] {
    return Array.from(this.items.values());
  }

  public getRejectionCount(): number {
    return Array.from(this.items.values()).filter((i) => i.classification === 'FEATURE_REQUEST_REJECT').length;
  }

  public getAdmittedBlockerCount(): number {
    return Array.from(this.items.values()).filter((i) => i.admittedToV2_26).length;
  }

  private seedInitialScopeGateEvaluations(): void {
    // Discovered Blocker 1: Core Inbox processing idempotency
    this.evaluateCandidate({
      id: 'gate_blocker_inbox_idempotency',
      title: 'Inbox item double-processing could create duplicate resource target',
      description: 'Triggering Process Inbox item concurrently must return existing created ID idempotently.',
      sourceArea: 'Inbox / Core Experience',
      reportedBy: 'V2.21 Audit Suite',
      classification: 'S1_RELEASE_BLOCKER',
      isNewFeature: false,
      justification: 'Fixes idempotent processing contract in frozen Inbox specification.',
    });

    // Discovered Blocker 2: Date-only midnight timezone shift in task overdue query
    this.evaluateCandidate({
      id: 'gate_blocker_timezone_overdue',
      title: 'Task overdue calculation affected by local browser midnight offset',
      description: 'Date-only strings (YYYY-MM-DD) must be parsed at local midday or date-only comparison to prevent premature overdue warnings.',
      sourceArea: 'Tasks / Temporal',
      reportedBy: 'Temporal Engine Audit',
      classification: 'S1_RELEASE_BLOCKER',
      isNewFeature: false,
      justification: 'Restores stable DateOnly comparison logic.',
    });

    // Discovered Blocker 3: Finance integer cent arithmetic split rounding check
    this.evaluateCandidate({
      id: 'gate_blocker_finance_split_rounding',
      title: 'Finance multi-split transaction exact penny balancing invariant',
      description: 'Ensure sum of split category allocations matches total transaction integer cents exactly.',
      sourceArea: 'Finance Domain',
      reportedBy: 'V2.22 Domain Audit',
      classification: 'S1_RELEASE_BLOCKER',
      isNewFeature: false,
      justification: 'Guarantees zero balance discrepancy in Personal OS Finance domain.',
    });

    // Feature Request 1: Multi-user live collaborative whiteboard (REJECTED)
    this.evaluateCandidate({
      id: 'gate_req_multiplayer_canvas',
      title: 'Add Live WebSocket Canvas Collaboration with Peer Cursors',
      description: 'Request for peer-to-peer live multiplayer drawing.',
      sourceArea: 'Canvas / Interoperability',
      reportedBy: 'Feature Request Intake',
      classification: 'FEATURE_REQUEST_REJECT',
      isNewFeature: true,
      justification: 'Feature freeze active. Cloud multi-user collaboration is strictly out of scope.',
    });

    // Feature Request 2: Autonomous AI Agent with Auto-Scheduled Background Notes (REJECTED)
    this.evaluateCandidate({
      id: 'gate_req_autonomous_agent',
      title: 'Add Autonomous AI Worker that drafts daily notes unsolicited',
      description: 'Request for autonomous AI background generation.',
      sourceArea: 'Intelligence / AI',
      reportedBy: 'Feature Request Intake',
      classification: 'FEATURE_REQUEST_REJECT',
      isNewFeature: true,
      justification: 'AI is strictly deterministic user-initiated and optional in frozen contract.',
    });
  }
}

export const v2_26HardeningScopeGate = V2_26HardeningScopeGate.getInstance();
