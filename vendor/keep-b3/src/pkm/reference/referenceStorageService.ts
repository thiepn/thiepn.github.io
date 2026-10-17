import {
  Reference,
  CitingNoteReference,
  CitationMatch,
} from './referenceTypes';
import { extractCitations } from './citationParser';
import { formatAuthorsList, formatPersonName } from './personName';
import { Note } from '../../types';
import { vaultEncryptionService } from '../encryption/vaultEncryptionService';

const DB_NAME = 'KeepNotes_Academic_References_DB';
const DB_VERSION = 1;
const STORE_NAME = 'references';
const STORAGE_BACKUP_KEY = 'keepnotes_references_backup_v1';

class ReferenceStorageService {
  private db: IDBDatabase | null = null;
  private referencesCache: Map<string, Reference> = new Map();
  private isLoaded = false;
  private listeners: Array<() => void> = [];

  // Index of citing notes: Map<citationKeyLower, CitingNoteReference[]>
  private citingNotesIndex: Map<string, CitingNoteReference[]> = new Map();

  /**
   * Initializes IndexedDB database
   */
  public async init(): Promise<void> {
    if (this.isLoaded) return;

    if (typeof indexedDB === 'undefined') {
      this.loadFromLocalStorage();
      this.isLoaded = true;
      return;
    }

    return new Promise((resolve) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            store.createIndex('citationKey', 'citationKey', { unique: false });
            store.createIndex('type', 'type', { unique: false });
            store.createIndex('year', 'year', { unique: false });
          }
        };

        request.onsuccess = async (event) => {
          this.db = (event.target as IDBOpenDBRequest).result;
          await this.loadAllFromDB();
          this.isLoaded = true;
          resolve();
        };

        request.onerror = () => {
          console.warn('Failed to open Reference IndexedDB, falling back to localStorage');
          this.loadFromLocalStorage();
          this.isLoaded = true;
          resolve();
        };
      } catch (err) {
        console.warn('IndexedDB error', err);
        this.loadFromLocalStorage();
        this.isLoaded = true;
        resolve();
      }
    });
  }

  /**
   * Subscribe to references changes
   */
  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (err) {
        console.error('ReferenceStorageService listener error', err);
      }
    }
  }

  /**
   * Purges all in-memory references when vault is locked
   */
  public purgeMemoryOnLock(): void {
    this.referencesCache.clear();
    this.citingNotesIndex.clear();
    this.isLoaded = false;
    this.notify();
  }

  /**
   * Loads all references from IndexedDB into memory
   */
  private async loadAllFromDB(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();

        req.onsuccess = async () => {
          const records: any[] = req.result || [];
          this.referencesCache.clear();

          for (const item of records) {
            // Check if record is encrypted
            if (item && item.isEncrypted && item.ciphertext && item.iv) {
              if (vaultEncryptionService.isVaultLocked() || !vaultEncryptionService.isVaultUnlocked()) {
                // Cannot decrypt yet
                continue;
              }
              try {
                const decryptedObj = await vaultEncryptionService.decryptRecord<Reference>(item);
                this.referencesCache.set(decryptedObj.id, decryptedObj);
              } catch (err) {
                console.error('Failed to decrypt reference record', item.id, err);
              }
            } else if (item && item.id) {
              this.referencesCache.set(item.id, item as Reference);
            }
          }
          resolve();
        };

        req.onerror = () => {
          this.loadFromLocalStorage();
          resolve();
        };
      } catch {
        this.loadFromLocalStorage();
        resolve();
      }
    });
  }

  private loadFromLocalStorage(): void {
    try {
      const raw = localStorage.getItem(STORAGE_BACKUP_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.referencesCache.clear();
          for (const r of parsed) {
            if (r && r.id) this.referencesCache.set(r.id, r);
          }
        }
      }
    } catch {
      // Ignore
    }
  }

  private persistBackup(): void {
    try {
      const all = Array.from(this.referencesCache.values());
      localStorage.setItem(STORAGE_BACKUP_KEY, JSON.stringify(all));
    } catch {
      // Ignore quota errors
    }
  }

  /**
   * Gets all Reference records
   */
  public getAllReferences(): Reference[] {
    return Array.from(this.referencesCache.values());
  }

  /**
   * Gets Reference by internal ID
   */
  public getReferenceById(id: string): Reference | undefined {
    return this.referencesCache.get(id);
  }

  /**
   * Gets Reference by Citation Key (case-insensitive)
   */
  public getReferenceByCitationKey(key: string): Reference | undefined {
    if (!key) return undefined;
    const cleanKey = key.trim().toLowerCase();
    for (const ref of this.referencesCache.values()) {
      if (ref.citationKey && ref.citationKey.toLowerCase() === cleanKey) {
        return ref;
      }
    }
    return undefined;
  }

  /**
   * Builds Map of citationKey -> Reference
   */
  public getCitationKeyMap(): Map<string, Reference> {
    const map = new Map<string, Reference>();
    for (const ref of this.referencesCache.values()) {
      if (ref.citationKey) {
        map.set(ref.citationKey.toLowerCase(), ref);
      }
    }
    return map;
  }

  /**
   * Saves or updates a Reference
   */
  public async saveReference(reference: Reference): Promise<void> {
    const updated: Reference = {
      ...reference,
      updatedAt: new Date().toISOString(),
    };

    this.referencesCache.set(updated.id, updated);
    this.persistBackup();

    if (this.db) {
      try {
        const tx = this.db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);

        if (vaultEncryptionService.isVaultEncrypted() && vaultEncryptionService.isVaultUnlocked()) {
          // Encrypt record
          const encryptedRecord = await vaultEncryptionService.encryptRecord(updated.id, 'reference' as any, updated);
          store.put(encryptedRecord);
        } else {
          store.put(updated);
        }
      } catch (err) {
        console.error('Failed to put reference in IndexedDB', err);
      }
    }

    this.notify();
  }

  /**
   * Saves multiple references in batch
   */
  public async saveReferencesBatch(references: Reference[]): Promise<void> {
    for (const ref of references) {
      this.referencesCache.set(ref.id, ref);
    }
    this.persistBackup();

    if (this.db) {
      try {
        const tx = this.db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        if (vaultEncryptionService.isVaultEncrypted() && vaultEncryptionService.isVaultUnlocked()) {
          for (const ref of references) {
            const encryptedRecord = await vaultEncryptionService.encryptRecord(ref.id, 'reference' as any, ref);
            store.put(encryptedRecord);
          }
        } else {
          for (const ref of references) {
            store.put(ref);
          }
        }
      } catch (err) {
        console.error('Failed to batch save references in IndexedDB', err);
      }
    }

    this.notify();
  }

  /**
   * Deletes a Reference by ID
   */
  public async deleteReference(id: string): Promise<void> {
    this.referencesCache.delete(id);
    this.persistBackup();

    if (this.db) {
      try {
        const tx = this.db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.delete(id);
      } catch (err) {
        console.error('Failed to delete reference from IndexedDB', err);
      }
    }

    this.notify();
  }

  /**
   * Links a PDF attachment to a Reference
   */
  public async linkPDFToReference(referenceId: string, pdfAttachmentId: string): Promise<void> {
    const ref = this.referencesCache.get(referenceId);
    if (!ref) return;

    const list = ref.pdfAttachmentIds || [];
    if (!list.includes(pdfAttachmentId)) {
      await this.saveReference({
        ...ref,
        pdfAttachmentIds: [...list, pdfAttachmentId],
      });
    }
  }

  /**
   * Unlinks a PDF attachment from a Reference
   */
  public async unlinkPDFFromReference(referenceId: string, pdfAttachmentId: string): Promise<void> {
    const ref = this.referencesCache.get(referenceId);
    if (!ref || !ref.pdfAttachmentIds) return;

    await this.saveReference({
      ...ref,
      pdfAttachmentIds: ref.pdfAttachmentIds.filter((id) => id !== pdfAttachmentId),
    });
  }

  /**
   * Updates Citing Notes index across all notes in the vault
   */
  public updateCitingNotesIndex(notes: Note[]): void {
    this.citingNotesIndex.clear();

    for (const note of notes) {
      if (!note || note.trashed || !note.content) continue;

      const { citations } = extractCitations(note.content);
      const lines = note.content.split('\n');

      for (const cit of citations) {
        const keyLower = cit.citationKey.toLowerCase();
        const lineContent = lines[cit.line] || '';
        const snippet = lineContent.trim().slice(0, 100);

        const list = this.citingNotesIndex.get(keyLower) || [];
        list.push({
          noteId: note.id,
          noteTitle: note.title || 'Untitled',
          citationKey: cit.citationKey,
          locator: cit.locator,
          line: cit.line,
          contextSnippet: snippet,
        });
        this.citingNotesIndex.set(keyLower, list);
      }
    }
  }

  /**
   * Returns all notes that cite a given citation key
   */
  public getCitingNotes(citationKey: string): CitingNoteReference[] {
    if (!citationKey) return [];
    return this.citingNotesIndex.get(citationKey.trim().toLowerCase()) || [];
  }

  /**
   * Fast multi-token search across references
   */
  public searchReferences(query: string, filterOptions?: {
    type?: string;
    hasPdf?: boolean;
    missingPdf?: boolean;
    hasDoi?: boolean;
    incompleteMetadata?: boolean;
    year?: number;
    tag?: string;
  }): Reference[] {
    let list = Array.from(this.referencesCache.values());

    if (filterOptions) {
      if (filterOptions.type && filterOptions.type !== 'all') {
        list = list.filter((r) => r.type === filterOptions.type);
      }
      if (filterOptions.hasPdf) {
        list = list.filter((r) => r.pdfAttachmentIds && r.pdfAttachmentIds.length > 0);
      }
      if (filterOptions.missingPdf) {
        list = list.filter((r) => !r.pdfAttachmentIds || r.pdfAttachmentIds.length === 0);
      }
      if (filterOptions.hasDoi) {
        list = list.filter((r) => Boolean(r.doi));
      }
      if (filterOptions.incompleteMetadata) {
        list = list.filter((r) => !r.title || !r.authors?.length || !r.year);
      }
      if (filterOptions.year) {
        list = list.filter((r) => r.year === filterOptions.year);
      }
      if (filterOptions.tag) {
        list = list.filter((r) => r.tags?.some((t) => t.toLowerCase() === filterOptions.tag!.toLowerCase()));
      }
    }

    if (!query || !query.trim()) {
      return list;
    }

    const tokens = query
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    return list.filter((ref) => {
      const authorText = (ref.authors || []).map((a) => `${a.family || ''} ${a.given || ''} ${a.literal || ''}`).join(' ');
      const searchable = `${ref.title || ''} ${ref.citationKey || ''} ${authorText} ${ref.journal || ''} ${ref.bookTitle || ''} ${ref.year || ''} ${ref.doi || ''} ${ref.arxivId || ''} ${(ref.tags || []).join(' ')}`.toLowerCase();

      return tokens.every((t) => searchable.includes(t));
    });
  }

  /**
   * Generates literature note content for a reference
   */
  public generateLiteratureNote(ref: Reference): { title: string; content: string; tags: string[] } {
    const authorStr = formatAuthorsList(ref.authors || [], { format: 'family-first' });
    const yearStr = ref.year ? String(ref.year) : 'n.d.';
    const title = `Literature: ${ref.title || ref.citationKey}`;

    const lines: string[] = [
      '---',
      `type: "literature"`,
      `citationKey: "${ref.citationKey}"`,
      `referenceId: "${ref.id}"`,
      ref.doi ? `doi: "${ref.doi}"` : '',
      `tags: ["literature", "reference", "${ref.type}"]`,
      '---',
      '',
      `# ${ref.title || 'Untitled'}`,
      '',
      `**Citation:** [@${ref.citationKey}]  `,
      `**Authors:** ${authorStr}  `,
      `**Year:** ${yearStr}  `,
      ref.journal ? `**Journal:** ${ref.journal}  ` : '',
      ref.bookTitle ? `**Book:** ${ref.bookTitle}  ` : '',
      ref.doi ? `**DOI:** [${ref.doi}](https://doi.org/${ref.doi})  ` : '',
      ref.url ? `**URL:** [${ref.url}](${ref.url})  ` : '',
      '',
      '## Summary',
      ref.abstract ? `> ${ref.abstract}\n` : '*Add summary of core problem and key findings here.*',
      '',
      '## Key Contributions & Ideas',
      '- Contribution 1',
      '- Contribution 2',
      '',
      '## Notes & Quotes',
      `> Key quote here [@${ref.citationKey}, p. 1]`,
      '',
      '## References & Connections',
      '- Linked concepts: ',
    ].filter((l) => l !== '');

    return {
      title,
      content: lines.join('\n'),
      tags: ['literature', 'reference', ref.type],
    };
  }
}

export const referenceStorageService = new ReferenceStorageService();
