/**
 * V1.2 Conflict Center Service
 * 
 * Provides a unified registry and resolution coordinator for all unresolved 
 * text and structured resource merge conflicts across the entire personal OS.
 */

import { FileConflict } from '../remoteGitTypes';
import { FieldConflict } from './structuredMerge';

export type ConflictDomain = 
  | 'note' 
  | 'finance' 
  | 'tracking' 
  | 'curriculum' 
  | 'people' 
  | 'projects' 
  | 'travel' 
  | 'assets' 
  | 'decisions' 
  | 'context';

export interface UnifiedConflictRecord {
  id: string;
  domain: ConflictDomain;
  resourceId: string;
  resourceTitle: string;
  detectedAt: number;
  status: 'pending' | 'resolved' | 'deferred';
  conflictType: 'text_3way' | 'field_mismatch' | 'deletion_conflict' | 'ordering_conflict' | 'financial_discrepancy';
  source: 'git_sync' | 'filesystem_mirror' | 'peer_sync' | 'backup_restore';
  
  // Content payloads for diff inspection
  localData: any;
  remoteData: any;
  baseData?: any;
  mergedDraft?: any;
  
  // Field-level breakdown if structured
  fieldConflicts?: FieldConflict[];
  
  // Resolution details
  resolutionChoice?: 'keep_local' | 'keep_remote' | 'merge_both' | 'keep_both' | 'custom';
  resolvedAt?: number;
  resolvedData?: any;
}

const CONFLICT_STORAGE_KEY = 'keepnotes_active_conflicts_v1_2';

export class ConflictCenterService {
  private conflicts: Map<string, UnifiedConflictRecord> = new Map();
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(CONFLICT_STORAGE_KEY);
        if (raw) {
          const list: UnifiedConflictRecord[] = JSON.parse(raw);
          for (const c of list) {
            this.conflicts.set(c.id, c);
          }
        }
      }
    } catch (err) {
      console.warn('Could not load conflicts from storage:', err);
    }
  }

  private persist() {
    try {
      if (typeof localStorage !== 'undefined') {
        const list = Array.from(this.conflicts.values());
        localStorage.setItem(CONFLICT_STORAGE_KEY, JSON.stringify(list));
      }
    } catch (err) {
      console.warn('Could not persist conflicts to storage:', err);
    }
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    for (const l of this.listeners) {
      try {
        l();
      } catch (err) {
        console.error('Error in conflict center listener:', err);
      }
    }
  }

  /**
   * Registers a newly detected conflict in the central registry
   */
  public registerConflict(record: Partial<UnifiedConflictRecord> & {
    resourceType?: string;
    title?: string;
    conflictSummary?: string;
    baseVersion?: any;
    localVersion?: any;
    remoteVersion?: any;
    conflictingFields?: string[];
  }): UnifiedConflictRecord {
    const id = record.id || `conflict-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const domain = (record.domain || record.resourceType || 'note') as ConflictDomain;
    
    const fullRecord: UnifiedConflictRecord = {
      id,
      domain,
      resourceId: record.resourceId || 'unknown',
      resourceTitle: record.resourceTitle || record.title || 'Untitled Resource',
      detectedAt: Date.now(),
      status: 'pending',
      conflictType: record.conflictType || 'field_mismatch',
      source: record.source || 'peer_sync',
      localData: record.localData ?? record.localVersion,
      remoteData: record.remoteData ?? record.remoteVersion,
      baseData: record.baseData ?? record.baseVersion,
      mergedDraft: record.mergedDraft,
      fieldConflicts: record.fieldConflicts,
    };

    this.conflicts.set(id, fullRecord);
    this.persist();
    return fullRecord;
  }


  /**
   * Converts a Git/Mirror FileConflict into a registered unified conflict
   */
  public registerFileConflict(
    fileConflict: FileConflict,
    domain: ConflictDomain = 'note',
    source: UnifiedConflictRecord['source'] = 'git_sync'
  ): UnifiedConflictRecord {
    return this.registerConflict({
      domain,
      resourceId: fileConflict.path,
      resourceTitle: fileConflict.path.split('/').pop() || fileConflict.path,
      conflictType: 'text_3way',
      source,
      localData: fileConflict.localContent,
      remoteData: fileConflict.remoteContent,
      baseData: fileConflict.baseContent,
      mergedDraft: fileConflict.mergedContent,
    });
  }

  /**
   * Resolves a conflict using the user's selected choice
   */
  public resolveConflict(
    conflictId: string,
    choice: 'keep_local' | 'keep_remote' | 'merge_both' | 'keep_both' | 'custom',
    customPayload?: any
  ): { success: boolean; resolvedData?: any } {
    const record = this.conflicts.get(conflictId);
    if (!record) return { success: false };

    let resolvedData: any;
    switch (choice) {
      case 'keep_local':
        resolvedData = record.localData;
        break;
      case 'keep_remote':
        resolvedData = record.remoteData;
        break;
      case 'merge_both':
      case 'keep_both':
        resolvedData = record.mergedDraft || record.localData;
        break;
      case 'custom':
        resolvedData = customPayload ?? record.localData;
        break;
    }

    record.status = 'resolved';
    record.resolutionChoice = choice;
    record.resolvedAt = Date.now();
    record.resolvedData = resolvedData;

    this.persist();
    return { success: true, resolvedData };
  }

  /**
   * Batch resolves multiple conflicts of a domain or all pending
   */
  public resolveBatch(
    choice: 'keep_local' | 'keep_remote',
    domainFilter?: ConflictDomain
  ): { resolvedCount: number } {
    let count = 0;
    for (const record of this.conflicts.values()) {
      if (record.status === 'pending') {
        if (!domainFilter || record.domain === domainFilter) {
          this.resolveConflict(record.id, choice);
          count++;
        }
      }
    }
    return { resolvedCount: count };
  }

  /**
   * Returns conflicts (defaults to pending conflicts if no filter is provided)
   */
  public getConflicts(filter?: { status?: UnifiedConflictRecord['status']; domain?: ConflictDomain }): UnifiedConflictRecord[] {
    let list = Array.from(this.conflicts.values());
    const targetStatus = filter?.status !== undefined ? filter.status : 'pending';
    list = list.filter((c) => c.status === targetStatus);
    
    if (filter?.domain) {
      list = list.filter((c) => c.domain === filter.domain);
    }
    return list.sort((a, b) => b.detectedAt - a.detectedAt);
  }

  /**
   * Returns all resolved conflict audit records
   */
  public getConflictHistory(): UnifiedConflictRecord[] {
    return Array.from(this.conflicts.values())
      .filter((c) => c.status === 'resolved')
      .sort((a, b) => (b.resolvedAt || 0) - (a.resolvedAt || 0));
  }

  /**
   * Clears all resolved conflicts from history
   */
  public clearAllResolved(): void {
    for (const [id, record] of this.conflicts.entries()) {
      if (record.status === 'resolved') {
        this.conflicts.delete(id);
      }
    }
    this.persist();
  }


  /**
   * Returns count of pending unresolved conflicts
   */
  public getPendingCount(): number {
    let count = 0;
    for (const c of this.conflicts.values()) {
      if (c.status === 'pending') count++;
    }
    return count;
  }

  /**
   * Cleans up resolved conflict history older than given days
   */
  public pruneResolved(olderThanDays = 30): number {
    const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
    let pruned = 0;

    for (const [id, record] of this.conflicts.entries()) {
      if (record.status === 'resolved' && (record.resolvedAt || 0) < cutoff) {
        this.conflicts.delete(id);
        pruned++;
      }
    }

    if (pruned > 0) {
      this.persist();
    }
    return pruned;
  }
}

export const conflictCenterService = new ConflictCenterService();
