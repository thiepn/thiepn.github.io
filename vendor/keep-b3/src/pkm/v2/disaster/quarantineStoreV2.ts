/**
 * PKM V2.6 — Quarantine Store & Corruption Isolation
 *
 * Isolates damaged or unparseable resources so they do not crash whole-vault
 * operations while preserving their exact raw content for user inspection or repair.
 */

import { QuarantineRecordV2 } from './backupTypesV2';

const QUARANTINE_STORAGE_KEY = 'pkm_v2_quarantine_store_v1';

export class QuarantineStoreV2 {
  private records: Map<string, QuarantineRecordV2> = new Map();
  private listeners: Set<(records: QuarantineRecordV2[]) => void> = new Set();

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(QUARANTINE_STORAGE_KEY);
        if (raw) {
          const list: QuarantineRecordV2[] = JSON.parse(raw);
          this.records.clear();
          for (const item of list) {
            this.records.set(item.id, item);
          }
        }
      }
    } catch (e) {
      console.warn('[QuarantineStoreV2] Failed to load quarantine storage:', e);
    }
  }

  private persist(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(QUARANTINE_STORAGE_KEY, JSON.stringify(Array.from(this.records.values())));
      }
    } catch (e) {
      console.warn('[QuarantineStoreV2] Failed to persist quarantine storage:', e);
    }
    this.notify();
  }

  public subscribe(listener: (records: QuarantineRecordV2[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.getAll());
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const all = this.getAll();
    for (const l of this.listeners) {
      try {
        l(all);
      } catch (err) {
        console.error('Error in quarantine listener:', err);
      }
    }
  }

  public getAll(): QuarantineRecordV2[] {
    return Array.from(this.records.values());
  }

  public get(id: string): QuarantineRecordV2 | undefined {
    return this.records.get(id);
  }

  public getByResourceId(resourceId: string): QuarantineRecordV2 | undefined {
    for (const rec of this.records.values()) {
      if (rec.resourceId === resourceId) return rec;
    }
    return undefined;
  }

  /**
   * Quarantines a corrupted resource, preserving exact raw content and generating suggested repair if possible
   */
  public quarantineResource(params: {
    resourceId: string;
    resourceType: string;
    reason: string;
    errorCode: string;
    rawPayload: string;
  }): QuarantineRecordV2 {
    const id = `quarantine_${params.resourceId}_${Date.now()}`;
    const suggestedRepair = this.generateDeterministicRepair(params.rawPayload, params.resourceType);

    const record: QuarantineRecordV2 = {
      id,
      resourceId: params.resourceId,
      resourceType: params.resourceType,
      quarantinedAt: new Date().toISOString(),
      reason: params.reason,
      errorCode: params.errorCode,
      rawPayload: params.rawPayload,
      suggestedRepair,
    };

    this.records.set(id, record);
    this.persist();
    return record;
  }

  /**
   * Releases a record from quarantine after successful repair or restoration
   */
  public release(id: string): boolean {
    const deleted = this.records.delete(id);
    if (deleted) {
      this.persist();
    }
    return deleted;
  }

  public clear(): void {
    this.records.clear();
    this.persist();
  }

  /**
   * Analyzes raw content and generates a deterministic repair preview (e.g. unclosed frontmatter, JSON syntax)
   */
  private generateDeterministicRepair(raw: string, resourceType: string): QuarantineRecordV2['suggestedRepair'] | undefined {
    if (!raw || typeof raw !== 'string') return undefined;

    // 1. Check for unclosed frontmatter in Markdown notes
    if (raw.startsWith('---') && raw.indexOf('---', 3) === -1) {
      const closingIdx = raw.indexOf('\n\n');
      const repaired = closingIdx !== -1
        ? raw.slice(0, closingIdx) + '\n---\n' + raw.slice(closingIdx + 2)
        : raw + '\n---\n';
      return {
        repairType: 'frontmatter_fix',
        description: 'Add missing closing YAML frontmatter delimiter (---)',
        repairedPayload: repaired,
      };
    }

    // 2. Check for trailing comma or unclosed bracket in JSON payloads
    if (raw.trim().startsWith('{') || raw.trim().startsWith('[')) {
      try {
        // Attempt fixing trailing comma
        const sanitized = raw.replace(/,(\s*[}\]])/g, '$1');
        JSON.parse(sanitized);
        return {
          repairType: 'schema_normalization',
          description: 'Remove invalid trailing commas in JSON envelope',
          repairedPayload: sanitized,
        };
      } catch {}
    }

    return undefined;
  }
}

export const quarantineStoreV2 = new QuarantineStoreV2();
