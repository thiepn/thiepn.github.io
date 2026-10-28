/**
 * V2.14 Master Quality & Future Architecture Ledger
 * 
 * Tracks all historical S0-S3 quality issues, accepted limitations, maintenance items,
 * and architectural compromises across V2.0 through V2.13 with final disposition.
 */

export type IssueSeverity = 'S0' | 'S1' | 'S2' | 'S3';
export type IssueFrequency = 'rare' | 'occasional' | 'frequent' | 'continuous';
export type IssuePlatform = 'all' | 'web' | 'desktop' | 'mobile' | 'tablet';

export type FinalIssueClassification =
  | 'Fixed in V2.14'
  | 'V2.x maintenance item'
  | 'Accepted limitation'
  | 'Beta limitation'
  | 'Experimental limitation'
  | 'Platform limitation'
  | 'V3 candidate'
  | 'Rejected / not worth solving'
  | 'Not reproducible';

export interface QualityLedgerEntry {
  id: string;
  subsystem: string;
  title: string;
  severity: IssueSeverity;
  frequency: IssueFrequency;
  userImpact: string;
  platform: IssuePlatform;
  dataRisk: boolean;
  securityPrivacyRisk: boolean;
  maintenanceCost: 'Low' | 'Moderate' | 'High' | 'Unsustainable';
  firstIntroduced: string;
  stillReproducible: boolean;
  v2xSolvable: boolean;
  potentialV3: boolean;
  recommendedAction: string;
  finalStatus: FinalIssueClassification;
}

export const V2_14_MASTER_QUALITY_ENTRIES: QualityLedgerEntry[] = [
  {
    id: 'LEDGER-001',
    subsystem: 'Storage / Transactions',
    title: 'IndexedDB transaction abort in non-browser Node test harness',
    severity: 'S2',
    frequency: 'rare',
    userImpact: 'No impact in real web/desktop/mobile browsers; graceful fallback in node runners.',
    platform: 'all',
    dataRisk: false,
    securityPrivacyRisk: false,
    maintenanceCost: 'Low',
    firstIntroduced: 'V2.6',
    stillReproducible: false,
    v2xSolvable: true,
    potentialV3: false,
    recommendedAction: 'Provide simulated in-memory storage fallback for Node.js runners.',
    finalStatus: 'Fixed in V2.14',
  },
  {
    id: 'LEDGER-002',
    subsystem: 'Sync Engine',
    title: 'Large binary attachment chunk synchronization over high-latency networks',
    severity: 'S2',
    frequency: 'occasional',
    userImpact: 'Binary media files >50MB may take longer to sync without differential chunking.',
    platform: 'all',
    dataRisk: false,
    securityPrivacyRisk: false,
    maintenanceCost: 'Moderate',
    firstIntroduced: 'V2.5',
    stillReproducible: true,
    v2xSolvable: true,
    potentialV3: false,
    recommendedAction: 'Keep media attachments externalized with streaming progress bar.',
    finalStatus: 'Accepted limitation',
  },
  {
    id: 'LEDGER-003',
    subsystem: 'Ecosystem / Notifications',
    title: 'Action idempotency on mobile push notification interactions',
    severity: 'S2',
    frequency: 'occasional',
    userImpact: 'Repeated quick actions on notification center might trigger duplicate callbacks.',
    platform: 'mobile',
    dataRisk: false,
    securityPrivacyRisk: false,
    maintenanceCost: 'Low',
    firstIntroduced: 'V2.12',
    stillReproducible: false,
    v2xSolvable: true,
    potentialV3: false,
    recommendedAction: 'Enforce prefix-keyed idempotency registry in RestrainedNotificationOrchestrator.',
    finalStatus: 'Fixed in V2.14',
  },
  {
    id: 'LEDGER-004',
    subsystem: 'Desktop Integration',
    title: 'Path traversal sanitization on external file drag-and-drop',
    severity: 'S2',
    frequency: 'rare',
    userImpact: 'Malicious external filenames with directory traversal sequences could target incorrect locations.',
    platform: 'desktop',
    dataRisk: false,
    securityPrivacyRisk: true,
    maintenanceCost: 'Low',
    firstIntroduced: 'V2.12',
    stillReproducible: false,
    v2xSolvable: true,
    potentialV3: false,
    recommendedAction: 'Sanitize basenames and prompt confirmation on OS Open-With actions.',
    finalStatus: 'Fixed in V2.14',
  },
  {
    id: 'LEDGER-005',
    subsystem: 'Domains / Finance',
    title: 'Sub-cent floating point precision drift in multi-currency conversions',
    severity: 'S2',
    frequency: 'rare',
    userImpact: 'Rounding errors if float arithmetic were used for currency.',
    platform: 'all',
    dataRisk: false,
    securityPrivacyRisk: false,
    maintenanceCost: 'Low',
    firstIntroduced: 'V2.13',
    stillReproducible: false,
    v2xSolvable: true,
    potentialV3: false,
    recommendedAction: 'Enforce exact integer-cents arithmetic throughout Finance ledger.',
    finalStatus: 'Fixed in V2.14',
  },
  {
    id: 'LEDGER-006',
    subsystem: 'Domains / Health',
    title: 'Confidential clinical health notes leaking into generic global search snippets',
    severity: 'S2',
    frequency: 'rare',
    userImpact: 'Potential over-exposure of private health biomarkers in unauthenticated previews.',
    platform: 'all',
    dataRisk: false,
    securityPrivacyRisk: true,
    maintenanceCost: 'Low',
    firstIntroduced: 'V2.13',
    stillReproducible: false,
    v2xSolvable: true,
    potentialV3: false,
    recommendedAction: 'Provenance and privacy scrubbing on health entity previews when locked.',
    finalStatus: 'Fixed in V2.14',
  },
  {
    id: 'LEDGER-007',
    subsystem: 'Plugins / Sandbox',
    title: 'Permission escalation on plugin background updates without user review',
    severity: 'S2',
    frequency: 'occasional',
    userImpact: 'Plugins acquiring new permissions without explicit consent.',
    platform: 'all',
    dataRisk: false,
    securityPrivacyRisk: true,
    maintenanceCost: 'Moderate',
    firstIntroduced: 'V2.12',
    stillReproducible: false,
    v2xSolvable: true,
    potentialV3: false,
    recommendedAction: 'Stage updates requiring user confirmation on permission expansion.',
    finalStatus: 'Fixed in V2.14',
  },
  {
    id: 'LEDGER-008',
    subsystem: 'Connectors / Resilience',
    title: 'External API 503 outage causing unhandled UI errors in core workspace',
    severity: 'S2',
    frequency: 'occasional',
    userImpact: 'Workspace freeze when external connector fails to respond.',
    platform: 'all',
    dataRisk: false,
    securityPrivacyRisk: false,
    maintenanceCost: 'Low',
    firstIntroduced: 'V2.12',
    stillReproducible: false,
    v2xSolvable: true,
    potentialV3: false,
    recommendedAction: 'Isolate connector states into needs_attention without degrading local notes.',
    finalStatus: 'Fixed in V2.14',
  },
  {
    id: 'LEDGER-009',
    subsystem: 'Mobile / Background Execution',
    title: 'OS Process Death during long background synchronization',
    severity: 'S3',
    frequency: 'occasional',
    userImpact: 'Background sync paused by mobile OS when app is deeply suspended.',
    platform: 'mobile',
    dataRisk: false,
    securityPrivacyRisk: false,
    maintenanceCost: 'Moderate',
    firstIntroduced: 'V2.12',
    stillReproducible: true,
    v2xSolvable: true,
    potentialV3: false,
    recommendedAction: 'Rely on honest foreground catch-up sync on app resume.',
    finalStatus: 'Platform limitation',
  },
  {
    id: 'LEDGER-010',
    subsystem: 'Collaboration',
    title: 'Simultaneous multi-user operational-transform / CRDT real-time document co-authoring',
    severity: 'S3',
    frequency: 'rare',
    userImpact: 'Product is strictly single-user offline-first Personal OS; no Google Docs-style live cursors.',
    platform: 'all',
    dataRisk: false,
    securityPrivacyRisk: false,
    maintenanceCost: 'Low',
    firstIntroduced: 'V2.0',
    stillReproducible: true,
    v2xSolvable: false,
    potentialV3: true,
    recommendedAction: 'Intentionally out of scope for single-user offline Personal OS; would require breaking V2 local-first identity.',
    finalStatus: 'V3 candidate',
  },
  {
    id: 'LEDGER-011',
    subsystem: 'Query Engine',
    title: 'Full AST compilation for arbitrary user-defined SQL queries',
    severity: 'S3',
    frequency: 'rare',
    userImpact: 'Users write structured typed visual filters, not arbitrary relational SQL.',
    platform: 'all',
    dataRisk: false,
    securityPrivacyRisk: false,
    maintenanceCost: 'Low',
    firstIntroduced: 'V2.2',
    stillReproducible: false,
    v2xSolvable: true,
    potentialV3: false,
    recommendedAction: 'Retain typed visual query builder with DateOnly, relations, and nested booleans.',
    finalStatus: 'Rejected / not worth solving',
  },
  {
    id: 'LEDGER-012',
    subsystem: 'Extreme Scale',
    title: 'Extreme vault rendering >100,000 notes simultaneously in single DOM list',
    severity: 'S3',
    frequency: 'rare',
    userImpact: 'Unvirtualized lists would exhaust memory if 100k items rendered at once.',
    platform: 'all',
    dataRisk: false,
    securityPrivacyRisk: false,
    maintenanceCost: 'Low',
    firstIntroduced: 'V2.7',
    stillReproducible: false,
    v2xSolvable: true,
    potentialV3: false,
    recommendedAction: 'Enforce windowed virtualized lists and bounded search result pagination.',
    finalStatus: 'Fixed in V2.14',
  },
];

export class MasterQualityLedgerEngine {
  private static instance: MasterQualityLedgerEngine | null = null;
  private entries: QualityLedgerEntry[] = [...V2_14_MASTER_QUALITY_ENTRIES];

  private constructor() {}

  public static getInstance(): MasterQualityLedgerEngine {
    if (!MasterQualityLedgerEngine.instance) {
      MasterQualityLedgerEngine.instance = new MasterQualityLedgerEngine();
    }
    return MasterQualityLedgerEngine.instance;
  }

  public getAllEntries(): QualityLedgerEntry[] {
    return [...this.entries];
  }

  public getUnresolvedS0Count(): number {
    return this.entries.filter(e => e.severity === 'S0' && e.stillReproducible).length;
  }

  public getUnresolvedStableCoreS1Count(): number {
    return this.entries.filter(e => e.severity === 'S1' && e.stillReproducible).length;
  }

  public getSummary() {
    const total = this.entries.length;
    const fixed = this.entries.filter(e => e.finalStatus === 'Fixed in V2.14').length;
    const maintenance = this.entries.filter(e => e.finalStatus === 'V2.x maintenance item').length;
    const acceptedLimits = this.entries.filter(e => e.finalStatus === 'Accepted limitation' || e.finalStatus === 'Platform limitation').length;
    const v3Candidates = this.entries.filter(e => e.finalStatus === 'V3 candidate').length;
    const rejected = this.entries.filter(e => e.finalStatus === 'Rejected / not worth solving').length;

    return {
      total,
      fixed,
      maintenance,
      acceptedLimits,
      v3Candidates,
      rejected,
      unresolvedS0: this.getUnresolvedS0Count(),
      unresolvedS1: this.getUnresolvedStableCoreS1Count(),
      qualityCeilingSatisfied: this.getUnresolvedS0Count() === 0 && this.getUnresolvedStableCoreS1Count() === 0,
    };
  }
}

export const masterQualityLedgerEngine = MasterQualityLedgerEngine.getInstance();
