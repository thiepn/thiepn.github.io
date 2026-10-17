/**
 * PKM V1.10: Master Quality Ledger
 * 
 * Comprehensive audit register of all system issues, UX roughness, platform limits,
 * and technical debt across V1.0–V1.9.
 * 
 * Strict classification:
 * - Must Fix in V1.10
 * - Keep as Known Limitation
 * - Experimental Feature Limitation
 * - V2 Candidate
 * - Won't Fix
 */

export type IssueSeverity = 'S0' | 'S1' | 'S2' | 'S3';
export type IssueArea =
  | 'Core Architecture'
  | 'Editor & Markdown'
  | 'Search & Navigation'
  | 'Home & Context'
  | 'Planning & Calendar'
  | 'Personal Domains'
  | 'Sync & Storage'
  | 'Backup & Export'
  | 'AI & Intelligence'
  | 'Plugins & Ecosystem'
  | 'Accessibility'
  | 'Platform & Mobile';

export type IssueClassification =
  | 'Must Fix in V1.10'
  | 'Keep as Known Limitation'
  | 'Experimental Feature Limitation'
  | 'V2 Candidate'
  | 'Won\'t Fix';

export type IssueStatus =
  | 'resolved_v1_10'
  | 'known_limitation'
  | 'experimental'
  | 'v2_candidate'
  | 'wont_fix';

export interface QualityIssue {
  id: string;
  area: IssueArea;
  severity: IssueSeverity;
  frequency: 'High' | 'Medium' | 'Low' | 'Rare';
  affectedUsers: 'All' | 'Power Users' | 'Mobile Users' | 'Offline Users' | 'Plugin Developers';
  affectedPlatform: 'All' | 'Mobile' | 'Desktop' | 'Web/PWA';
  firstIntroduced: string;
  stillReproducible: boolean;
  rootCause: string;
  v1_10Action: string;
  isV2Candidate: boolean;
  classification: IssueClassification;
  finalStatus: IssueStatus;
}

export const MASTER_QUALITY_LEDGER: QualityIssue[] = [
  {
    id: 'MQL-001',
    area: 'Home & Context',
    severity: 'S2',
    frequency: 'Medium',
    affectedUsers: 'All',
    affectedPlatform: 'All',
    firstIntroduced: 'V1.1',
    stillReproducible: false,
    rootCause: 'Duplicate event/task rendering across Now, Attention, and Today when items have both scheduled and due timestamps.',
    v1_10Action: 'Implemented unified item deduplication hash in Home & Attention rendering pipeline.',
    isV2Candidate: false,
    classification: 'Must Fix in V1.10',
    finalStatus: 'resolved_v1_10',
  },
  {
    id: 'MQL-002',
    area: 'Search & Navigation',
    severity: 'S2',
    frequency: 'Medium',
    affectedUsers: 'Power Users',
    affectedPlatform: 'All',
    firstIntroduced: 'V1.6',
    stillReproducible: false,
    rootCause: 'Command Palette and Quick Switcher had overlapping entrypoints and blurred action/navigation boundaries.',
    v1_10Action: 'Enforced strict triad rule: Search = find content, Switcher = jump to resource, Command Palette = execute action.',
    isV2Candidate: false,
    classification: 'Must Fix in V1.10',
    finalStatus: 'resolved_v1_10',
  },
  {
    id: 'MQL-003',
    area: 'Planning & Calendar',
    severity: 'S2',
    frequency: 'Medium',
    affectedUsers: 'All',
    affectedPlatform: 'All',
    firstIntroduced: 'V1.3',
    stillReproducible: false,
    rootCause: 'Year-boundary transition (Dec 31 -> Jan 1) caused recurring task next-occurrence calculations to misalign weekly sequences.',
    v1_10Action: 'Added ISO-8601 year boundary and leap day normalization to recurrence engine.',
    isV2Candidate: false,
    classification: 'Must Fix in V1.10',
    finalStatus: 'resolved_v1_10',
  },
  {
    id: 'MQL-004',
    area: 'Core Architecture',
    severity: 'S2',
    frequency: 'Medium',
    affectedUsers: 'All',
    affectedPlatform: 'All',
    firstIntroduced: 'V1.4',
    stillReproducible: false,
    rootCause: 'Unbounded AST cache in KaTeX and Markdown parser caused gradual memory increase over 30-day continuous sessions.',
    v1_10Action: 'Bounded all caches with strict LRU caps (50-200 entries) in central CacheRegistry.',
    isV2Candidate: false,
    classification: 'Must Fix in V1.10',
    finalStatus: 'resolved_v1_10',
  },
  {
    id: 'MQL-005',
    area: 'Accessibility',
    severity: 'S2',
    frequency: 'Medium',
    affectedUsers: 'All',
    affectedPlatform: 'All',
    firstIntroduced: 'V1.5',
    stillReproducible: false,
    rootCause: 'Focus was not reliably restored to the trigger element when closing modals via Escape key.',
    v1_10Action: 'Added focus trap and origin trigger restoration across all PKM modal shells.',
    isV2Candidate: false,
    classification: 'Must Fix in V1.10',
    finalStatus: 'resolved_v1_10',
  },
  {
    id: 'MQL-006',
    area: 'Sync & Storage',
    severity: 'S2',
    frequency: 'Low',
    affectedUsers: 'Power Users',
    affectedPlatform: 'All',
    firstIntroduced: 'V1.2',
    stillReproducible: false,
    rootCause: 'Tombstones accumulated indefinitely without purge lifecycle, leading to metadata bloat after 6+ months.',
    v1_10Action: 'Introduced bounded 90-day tombstone compaction during periodic maintenance scheduling.',
    isV2Candidate: false,
    classification: 'Must Fix in V1.10',
    finalStatus: 'resolved_v1_10',
  },
  {
    id: 'MQL-007',
    area: 'Sync & Storage',
    severity: 'S2',
    frequency: 'Low',
    affectedUsers: 'Power Users',
    affectedPlatform: 'All',
    firstIntroduced: 'V1.2',
    stillReproducible: true,
    rootCause: 'Realtime multi-device concurrent editing requires CRDT / operational transformation server architecture.',
    v1_10Action: 'Retained as documented single-user local-first limitation. Merge engine performs deterministic 3-way text merge.',
    isV2Candidate: true,
    classification: 'V2 Candidate',
    finalStatus: 'v2_candidate',
  },
  {
    id: 'MQL-008',
    area: 'Plugins & Ecosystem',
    severity: 'S3',
    frequency: 'Low',
    affectedUsers: 'Plugin Developers',
    affectedPlatform: 'Mobile',
    firstIntroduced: 'V1.5',
    stillReproducible: true,
    rootCause: 'Mobile browser sandbox restricts eval/Worker spawning in strict iOS Capacitor environments.',
    v1_10Action: 'Marked mobile plugin execution as Experimental; desktop/web remain fully sandboxed.',
    isV2Candidate: false,
    classification: 'Experimental Feature Limitation',
    finalStatus: 'experimental',
  },
  {
    id: 'MQL-009',
    area: 'Editor & Markdown',
    severity: 'S3',
    frequency: 'Rare',
    affectedUsers: 'Power Users',
    affectedPlatform: 'Desktop',
    firstIntroduced: 'V1.0',
    stillReproducible: true,
    rootCause: 'Rendering single monolithic Markdown files exceeding 10MB (100,000+ lines) causes virtual DOM layout recalculation spikes.',
    v1_10Action: 'Documented as known limitation. Advise breaking 100k-line documents into sub-notes or transclusions.',
    isV2Candidate: false,
    classification: 'Keep as Known Limitation',
    finalStatus: 'known_limitation',
  },
  {
    id: 'MQL-010',
    area: 'AI & Intelligence',
    severity: 'S3',
    frequency: 'Low',
    affectedUsers: 'Power Users',
    affectedPlatform: 'All',
    firstIntroduced: 'V1.4',
    stillReproducible: false,
    rootCause: 'Legacy AI entrypoints existed in multiple disparate sub-panels with inconsistent source scoping.',
    v1_10Action: 'Consolidated all AI actions behind explicit Ask Vault / Context modal with source scope selector.',
    isV2Candidate: false,
    classification: 'Must Fix in V1.10',
    finalStatus: 'resolved_v1_10',
  },
  {
    id: 'MQL-011',
    area: 'Backup & Export',
    severity: 'S3',
    frequency: 'Medium',
    affectedUsers: 'All',
    affectedPlatform: 'All',
    firstIntroduced: 'V1.8',
    stillReproducible: false,
    rootCause: 'Terminology confusion between "Full Encrypted Backup" (.vault) vs "Portable Markdown Export" (.zip).',
    v1_10Action: 'Separated UI panels with distinct visual badges and explanatory copy in Export Center & Settings.',
    isV2Candidate: false,
    classification: 'Must Fix in V1.10',
    finalStatus: 'resolved_v1_10',
  },
  {
    id: 'MQL-012',
    area: 'Personal Domains',
    severity: 'S3',
    frequency: 'Low',
    affectedUsers: 'All',
    affectedPlatform: 'All',
    firstIntroduced: 'V1.6',
    stillReproducible: false,
    rootCause: 'Legacy term "Smart View" was still used in certain domain headers instead of canonical "Saved View".',
    v1_10Action: 'Audited and updated all UI strings, types, and docs to standard "Saved View".',
    isV2Candidate: false,
    classification: 'Must Fix in V1.10',
    finalStatus: 'resolved_v1_10',
  },
];

export class MasterQualityLedgerService {
  public getAll(): QualityIssue[] {
    return [...MASTER_QUALITY_LEDGER];
  }

  public getByArea(area: IssueArea): QualityIssue[] {
    return MASTER_QUALITY_LEDGER.filter((i) => i.area === area);
  }

  public getBySeverity(severity: IssueSeverity): QualityIssue[] {
    return MASTER_QUALITY_LEDGER.filter((i) => i.severity === severity);
  }

  public getByStatus(status: IssueStatus): QualityIssue[] {
    return MASTER_QUALITY_LEDGER.filter((i) => i.finalStatus === status);
  }

  public getStats() {
    const total = MASTER_QUALITY_LEDGER.length;
    const s0Count = MASTER_QUALITY_LEDGER.filter((i) => i.severity === 'S0').length;
    const s1Count = MASTER_QUALITY_LEDGER.filter((i) => i.severity === 'S1').length;
    const s2Count = MASTER_QUALITY_LEDGER.filter((i) => i.severity === 'S2').length;
    const s3Count = MASTER_QUALITY_LEDGER.filter((i) => i.severity === 'S3').length;

    const resolvedV110 = MASTER_QUALITY_LEDGER.filter((i) => i.finalStatus === 'resolved_v1_10').length;
    const knownLimitations = MASTER_QUALITY_LEDGER.filter((i) => i.finalStatus === 'known_limitation').length;
    const experimental = MASTER_QUALITY_LEDGER.filter((i) => i.finalStatus === 'experimental').length;
    const v2Candidates = MASTER_QUALITY_LEDGER.filter((i) => i.finalStatus === 'v2_candidate').length;
    const wontFix = MASTER_QUALITY_LEDGER.filter((i) => i.finalStatus === 'wont_fix').length;

    return {
      total,
      s0Count,
      s1Count,
      s2Count,
      s3Count,
      resolvedV110,
      knownLimitations,
      experimental,
      v2Candidates,
      wontFix,
      stableCoreBlockers: s0Count + s1Count,
    };
  }
}

export const masterQualityLedger = new MasterQualityLedgerService();
