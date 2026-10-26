/**
 * V2.28 Scope & Feasibility Gate
 * 
 * Enforces the strict V2.25 Feature Freeze contract during the V2.28 Specialist Hardening Phase.
 * Classifies candidate workstreams across Performance, Accessibility, and Platform Hardening,
 * rejects speculative optimizations and unrequested feature creep, and enforces zero new product features.
 */

export type V2_28CandidateClassification =
  | 'ADMIT_PERFORMANCE'
  | 'ADMIT_ACCESSIBILITY'
  | 'ADMIT_PLATFORM'
  | 'ADMIT_MINIMAL_FIX'
  | 'DOCUMENT_PLATFORM_LIMITATION'
  | 'DEFER_TO_RC_VERIFICATION'
  | 'FEATURE_REQUEST_REJECT'
  | 'NOT_REPRODUCIBLE';

export interface V2_28ScopeGateEntry {
  id: string;
  finding: string;
  category: 'Performance' | 'Accessibility' | 'Platform' | 'InputGlobalization' | 'FeatureRequest';
  evidence: string;
  userImpact: string;
  feasibleFix: string;
  feasibleWithoutRedesign: boolean;
  classification: V2_28CandidateClassification;
  justification: string;
  admitted: boolean;
}

export class V2_28ScopeGateService {
  private static instance: V2_28ScopeGateService;
  private readonly entries: Map<string, V2_28ScopeGateEntry> = new Map();

  private constructor() {
    this.seedAuthoritativeEntries();
  }

  public static getInstance(): V2_28ScopeGateService {
    if (!V2_28ScopeGateService.instance) {
      V2_28ScopeGateService.instance = new V2_28ScopeGateService();
    }
    return V2_28ScopeGateService.instance;
  }

  public evaluateCandidate(candidate: Omit<V2_28ScopeGateEntry, 'admitted'>): V2_28ScopeGateEntry {
    let admitted = false;
    let classification = candidate.classification;

    if (
      classification === 'FEATURE_REQUEST_REJECT' ||
      candidate.finding.toLowerCase().includes('new domain') ||
      candidate.finding.toLowerCase().includes('new workflow') ||
      candidate.finding.toLowerCase().includes('cloud backend') ||
      candidate.finding.toLowerCase().includes('collaboration') ||
      candidate.finding.toLowerCase().includes('redesign') ||
      candidate.finding.toLowerCase().includes('stylus-specific feature')
    ) {
      classification = 'FEATURE_REQUEST_REJECT';
      admitted = false;
    } else if (
      classification === 'ADMIT_PERFORMANCE' ||
      classification === 'ADMIT_ACCESSIBILITY' ||
      classification === 'ADMIT_PLATFORM' ||
      classification === 'ADMIT_MINIMAL_FIX'
    ) {
      admitted = candidate.feasibleWithoutRedesign;
    } else {
      admitted = false;
    }

    const entry: V2_28ScopeGateEntry = {
      ...candidate,
      classification,
      admitted,
    };

    this.entries.set(entry.id, entry);
    return entry;
  }

  public getAllEntries(): V2_28ScopeGateEntry[] {
    return Array.from(this.entries.values());
  }

  public getAdmittedWorkstreams(): V2_28ScopeGateEntry[] {
    return this.getAllEntries().filter((e) => e.admitted);
  }

  public getRejectedFeatureRequests(): V2_28ScopeGateEntry[] {
    return this.getAllEntries().filter((e) => e.classification === 'FEATURE_REQUEST_REJECT');
  }

  private seedAuthoritativeEntries(): void {
    const defaultEntries: Omit<V2_28ScopeGateEntry, 'admitted'>[] = [
      {
        id: 'GATE-28-01',
        finding: 'Startup critical path loads non-essential optional domain projections synchronously',
        category: 'Performance',
        evidence: 'Profiler trace shows 280ms cold start delay evaluating dormant connector state',
        userImpact: 'Delayed Time-to-Interactive on low-power mobile devices',
        feasibleFix: 'Defer non-essential domain index initialization until idle or explicit route navigation',
        feasibleWithoutRedesign: true,
        classification: 'ADMIT_PERFORMANCE',
        justification: 'Fixes cold-start bottleneck without altering underlying storage schema',
      },
      {
        id: 'GATE-28-02',
        finding: 'Large-vault (50k+ notes) search queries cause synchronous main-thread hitch',
        category: 'Performance',
        evidence: 'Main thread CPU stall of ~85ms on full-vault scans without worker offloading',
        userImpact: 'UI jitter during active query typing in large vaults',
        feasibleFix: 'Offload lexical token filtering to prioritized Worker and virtualize card mount pool',
        feasibleWithoutRedesign: true,
        classification: 'ADMIT_PERFORMANCE',
        justification: 'Protects input responsiveness and respects worker priority ladder',
      },
      {
        id: 'GATE-28-03',
        finding: 'Board and Calendar drag operations lack full non-pointer keyboard alternatives',
        category: 'Accessibility',
        evidence: 'Keyboard-only user cannot move cards between kanban columns without mouse interaction',
        userImpact: 'A0 violation for assistive input users needing task state mutations',
        feasibleFix: 'Expose direct "Move to Column" and explicit datetime picker keyboard actions',
        feasibleWithoutRedesign: true,
        classification: 'ADMIT_ACCESSIBILITY',
        justification: 'Ensures 100% keyboard operability for frozen core workflow',
      },
      {
        id: 'GATE-28-04',
        finding: 'Interactive charts and spatial canvas lack structured textual / list representations',
        category: 'Accessibility',
        evidence: 'Screen reader cannot parse raw vector canvas coordinates or canvas connections',
        userImpact: 'Information lock-out for blind and low-vision users',
        feasibleFix: 'Render structured table/list companion trees exposing node titles, links, and summaries',
        feasibleWithoutRedesign: true,
        classification: 'ADMIT_ACCESSIBILITY',
        justification: 'Meets WCAG 2.2 AA non-text content criteria without modifying canvas physics',
      },
      {
        id: 'GATE-28-05',
        finding: 'Korean IME composition prematurely triggers Enter submit in Quick Switcher and Search',
        category: 'InputGlobalization',
        evidence: 'isComposing flag not checked during onKeyDown event, firing search execution mid-syllable',
        userImpact: 'Corrupted search queries and accidental navigation on Korean/CJK input',
        feasibleFix: 'Guard all Enter/Escape handlers with native isComposing check and synthetic buffer flush',
        feasibleWithoutRedesign: true,
        classification: 'ADMIT_MINIMAL_FIX',
        justification: 'Essential input method safety across all globalized text inputs',
      },
      {
        id: 'GATE-28-06',
        finding: 'PWA service worker in offline mode occasionally triggers repeated update checks',
        category: 'Platform',
        evidence: 'Network failure event handler schedules infinite 1000ms retry backoff loops',
        userImpact: 'Unnecessary battery and CPU drain on mobile offline sessions',
        feasibleFix: 'Cap exponential backoff and suppress offline registration loops when navigator.onLine is false',
        feasibleWithoutRedesign: true,
        classification: 'ADMIT_PLATFORM',
        justification: 'Preserves mobile battery and enforces robust offline runtime',
      },
      {
        id: 'GATE-28-REJECT-01',
        finding: 'User request to build a real-time multiplayer cursor synchronization layer',
        category: 'FeatureRequest',
        evidence: 'Proposed WebRTC mesh network with live cursors and peer-to-peer video streaming',
        userImpact: 'Breaches local-first architecture and violates V2.25 Feature Freeze',
        feasibleFix: 'None. Permanent rejection.',
        feasibleWithoutRedesign: false,
        classification: 'FEATURE_REQUEST_REJECT',
        justification: 'Strictly prohibited under V2.25 freeze and scope discipline rules',
      },
      {
        id: 'GATE-28-REJECT-02',
        finding: 'Proposal to add a 3D procedural spatial metaverse canvas view',
        category: 'FeatureRequest',
        evidence: 'Proposed Three.js 3D spatial node clustering view',
        userImpact: 'Massive code bloat, high battery drain, and unrequested feature volume',
        feasibleFix: 'None. Permanent rejection.',
        feasibleWithoutRedesign: false,
        classification: 'FEATURE_REQUEST_REJECT',
        justification: 'Speculative feature addition forbidden post-freeze',
      },
    ];

    for (const entry of defaultEntries) {
      this.evaluateCandidate(entry);
    }
  }
}

export const v2_28ScopeGate = V2_28ScopeGateService.getInstance();
