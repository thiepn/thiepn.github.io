/**
 * V2.27 Scope & Feasibility Gate
 * 
 * Enforces the strict V2.25 Feature Freeze contract during the V2.27 Hardening Phase.
 * Classifies candidate workstreams, validates architectural feasibility without redesigns,
 * and ensures that only reliability, security, and data integrity fixes are admitted.
 */

export type V2_27CandidateClassification =
  | 'ADMIT_RELIABILITY'
  | 'ADMIT_DATA_INTEGRITY'
  | 'ADMIT_SECURITY'
  | 'ADMIT_MINIMAL_FIX'
  | 'DEFER_TO_V2_28'
  | 'DOCUMENT_LIMITATION'
  | 'FEATURE_REQUEST_REJECT'
  | 'NOT_REPRODUCIBLE';

export interface V2_27ScopeGateEntry {
  id: string;
  finding: string;
  risk: string;
  existingMechanism: string;
  proposedHardening: string;
  feasibleWithoutRedesign: boolean;
  classification: V2_27CandidateClassification;
  justification: string;
  admitted: boolean;
}

export class V2_27ScopeGateService {
  private static instance: V2_27ScopeGateService;
  private readonly entries: Map<string, V2_27ScopeGateEntry> = new Map();

  private constructor() {
    this.seedAuthoritativeEntries();
  }

  public static getInstance(): V2_27ScopeGateService {
    if (!V2_27ScopeGateService.instance) {
      V2_27ScopeGateService.instance = new V2_27ScopeGateService();
    }
    return V2_27ScopeGateService.instance;
  }

  public evaluateCandidate(candidate: Omit<V2_27ScopeGateEntry, 'admitted'>): V2_27ScopeGateEntry {
    let admitted = false;
    let classification = candidate.classification;

    if (
      classification === 'FEATURE_REQUEST_REJECT' ||
      candidate.finding.toLowerCase().includes('new domain') ||
      candidate.finding.toLowerCase().includes('new workflow') ||
      candidate.finding.toLowerCase().includes('cloud backend') ||
      candidate.finding.toLowerCase().includes('collaboration')
    ) {
      classification = 'FEATURE_REQUEST_REJECT';
      admitted = false;
    } else if (
      classification === 'ADMIT_RELIABILITY' ||
      classification === 'ADMIT_DATA_INTEGRITY' ||
      classification === 'ADMIT_SECURITY' ||
      classification === 'ADMIT_MINIMAL_FIX'
    ) {
      admitted = candidate.feasibleWithoutRedesign;
    } else {
      admitted = false;
    }

    const result: V2_27ScopeGateEntry = {
      ...candidate,
      classification,
      admitted,
    };

    this.entries.set(result.id, result);
    return result;
  }

  public getAllEntries(): V2_27ScopeGateEntry[] {
    return Array.from(this.entries.values());
  }

  public getAdmittedWorkstreams(): V2_27ScopeGateEntry[] {
    return this.getAllEntries().filter((e) => e.admitted);
  }

  public getRejectedFeatureRequests(): V2_27ScopeGateEntry[] {
    return this.getAllEntries().filter((e) => e.classification === 'FEATURE_REQUEST_REJECT');
  }

  public getDeferredToV2_28(): V2_27ScopeGateEntry[] {
    return this.getAllEntries().filter((e) => e.classification === 'DEFER_TO_V2_28');
  }

  public getDocumentedLimitations(): V2_27ScopeGateEntry[] {
    return this.getAllEntries().filter((e) => e.classification === 'DOCUMENT_LIMITATION');
  }

  private seedAuthoritativeEntries(): void {
    const defaultEntries: Omit<V2_27ScopeGateEntry, 'admitted'>[] = [
      {
        id: 'GATE-01',
        finding: 'Direct IndexedDB write bypass in legacy plugin handler',
        risk: 'Partial or unjournaled mutation bypassing transactional invariants',
        existingMechanism: 'IndexedDB Direct Put',
        proposedHardening: 'Route all writes through Authoritative Mutation Service with recovery journal',
        feasibleWithoutRedesign: true,
        classification: 'ADMIT_DATA_INTEGRITY',
        justification: 'Critical to guarantee canonical write safety and prevent partial state corruption.',
      },
      {
        id: 'GATE-02',
        finding: 'Database open failure could masquerade as empty vault in edge case',
        risk: 'Data loss panic and overwrite of existing database stores',
        existingMechanism: 'Catch error and return empty object',
        proposedHardening: 'Explicit StorageOpenException with deterministic Recovery Mode halt',
        feasibleWithoutRedesign: true,
        classification: 'ADMIT_DATA_INTEGRITY',
        justification: 'Essential storage integrity requirement; opening errors must never show empty vaults.',
      },
      {
        id: 'GATE-03',
        finding: 'Stale offline device rejoining after 90+ days might resurrect deleted items',
        risk: 'Deleted canonical notes/tasks re-emerging on other devices',
        existingMechanism: 'Simple timestamp comparison',
        proposedHardening: 'Authoritative tombstone tracking with device sync horizon validation',
        feasibleWithoutRedesign: true,
        classification: 'ADMIT_RELIABILITY',
        justification: 'Guarantees multi-device convergence and reliable tombstone GC invariants.',
      },
      {
        id: 'GATE-04',
        finding: 'Encrypted backup restore with wrong password might fail mid-stream',
        risk: 'Corrupted destination state during inspection',
        existingMechanism: 'In-place decryption attempt',
        proposedHardening: 'Zero-mutation staged verification before target vault replacement',
        feasibleWithoutRedesign: true,
        classification: 'ADMIT_SECURITY',
        justification: 'Inspection and verification must never mutate target vault until fully verified.',
      },
      {
        id: 'GATE-05',
        finding: 'AI prompt injection through user notes attempting to exfiltrate private finance data',
        risk: 'Protected health/finance records leaking into external AI completions',
        existingMechanism: 'Post-generation regex filtering',
        proposedHardening: 'Pre-retrieval scope exclusion boundary; excluded domains never enter candidate pool',
        feasibleWithoutRedesign: true,
        classification: 'ADMIT_SECURITY',
        justification: 'Trust boundary mandate: permission filtering must happen before candidate retrieval.',
      },
      {
        id: 'GATE-06',
        finding: 'Request for multi-user real-time collaborative editing backend',
        risk: 'Breaches client-only offline-first architecture and V2.25 Feature Freeze',
        existingMechanism: 'Local-first peer and file-based sync',
        proposedHardening: 'N/A',
        feasibleWithoutRedesign: false,
        classification: 'FEATURE_REQUEST_REJECT',
        justification: 'Post-V2.25 feature freeze strictly rejects new collaboration and cloud architectures.',
      },
      {
        id: 'GATE-07',
        finding: 'Request for new Social Media auto-publishing domain',
        risk: 'Feature scope creep and new external network attack surface',
        existingMechanism: 'N/A',
        proposedHardening: 'N/A',
        feasibleWithoutRedesign: false,
        classification: 'FEATURE_REQUEST_REJECT',
        justification: 'New domains are explicitly forbidden post-freeze.',
      },
      {
        id: 'GATE-08',
        finding: 'Virtualization of long revision histories and smooth 120fps scrolling',
        risk: 'User interface smoothness on low-end devices',
        existingMechanism: 'Standard React list rendering',
        proposedHardening: 'Virtual list windowing & scroll optimization',
        feasibleWithoutRedesign: true,
        classification: 'DEFER_TO_V2_28',
        justification: 'Performance and rendering optimizations are specifically allocated to V2.28.',
      },
      {
        id: 'GATE-09',
        finding: 'Web browser sandboxed memory zeroization limits in pure JavaScript',
        risk: 'Garbage collector may retain transient decrypted buffers in process memory',
        existingMechanism: 'Explicit buffer nulling and session token invalidation',
        proposedHardening: 'Document physical memory limitation while enforcing session invalidation',
        feasibleWithoutRedesign: true,
        classification: 'DOCUMENT_LIMITATION',
        justification: 'Realistic security disclosure for browser runtime limitations.',
      },
    ];

    for (const entry of defaultEntries) {
      this.evaluateCandidate(entry);
    }
  }
}

export const v2_27ScopeGate = V2_27ScopeGateService.getInstance();
