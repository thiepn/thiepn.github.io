import { Note } from '../types';
import {
  VaultIndex,
  ParsedNote,
  PKMBacklink,
  PKMWikiLink,
  ResolvedLinkTarget,
} from './types';
import {
  buildVaultIndex,
  createEmptyVaultIndex,
  applyIncrementalNoteUpdate,
} from './vaultIndex';
import { PKMResolver } from './resolver';

export type IndexSubscriber = (index: VaultIndex) => void;

/**
 * High-performance, incremental Vault Index Manager
 */
export class VaultIndexManager {
  private currentIndex: VaultIndex = createEmptyVaultIndex();
  private subscribers = new Set<IndexSubscriber>();
  private allNotesMap = new Map<string, Note>();
  private pendingDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingUpdates = new Map<string, Note | null>();

  constructor(initialNotes?: Note[]) {
    if (initialNotes && initialNotes.length > 0) {
      this.rebuildIndex(initialNotes);
    }
  }

  /**
   * Get the current snapshot of the derived vault index
   */
  public getIndex(): VaultIndex {
    return this.currentIndex;
  }

  /**
   * Complete deterministic rebuild of the vault index
   */
  public rebuildIndex(notes: Note[]): VaultIndex {
    this.allNotesMap.clear();
    for (const n of notes) {
      if (n && !n.trashed) {
        this.allNotesMap.set(n.id, n);
      }
    }

    this.currentIndex = buildVaultIndex(notes);
    this.notifySubscribers();
    return this.currentIndex;
  }

  /**
   * Incremental update for a single note creation
   */
  public onNoteCreated(note: Note): VaultIndex {
    if (!note || note.trashed) return this.currentIndex;
    this.allNotesMap.set(note.id, note);
    this.currentIndex = applyIncrementalNoteUpdate(
      note,
      note.id,
      this.currentIndex,
      this.allNotesMap
    );
    this.notifySubscribers();
    return this.currentIndex;
  }

  /**
   * Incremental update for a single note modification
   */
  public onNoteUpdated(note: Note): VaultIndex {
    if (!note) return this.currentIndex;
    if (note.trashed) {
      return this.onNoteDeleted(note.id);
    }

    this.allNotesMap.set(note.id, note);
    this.currentIndex = applyIncrementalNoteUpdate(
      note,
      note.id,
      this.currentIndex,
      this.allNotesMap
    );
    this.notifySubscribers();
    return this.currentIndex;
  }

  /**
   * Incremental update for a single note deletion
   */
  public onNoteDeleted(noteId: string): VaultIndex {
    this.allNotesMap.delete(noteId);
    this.currentIndex = applyIncrementalNoteUpdate(
      null,
      noteId,
      this.currentIndex,
      this.allNotesMap
    );
    this.notifySubscribers();
    return this.currentIndex;
  }

  /**
   * Debounced incremental update for rapid keystrokes (e.g. active editing)
   */
  public queueDebouncedNoteUpdate(note: Note, delayMs: number = 80): void {
    this.pendingUpdates.set(note.id, note);

    if (this.pendingDebounceTimer) {
      clearTimeout(this.pendingDebounceTimer);
    }

    this.pendingDebounceTimer = setTimeout(() => {
      this.flushPendingUpdates();
    }, delayMs);
  }

  /**
   * Flushes all queued debounced updates immediately
   */
  public flushPendingUpdates(): void {
    if (this.pendingDebounceTimer) {
      clearTimeout(this.pendingDebounceTimer);
      this.pendingDebounceTimer = null;
    }

    if (this.pendingUpdates.size === 0) return;

    for (const [id, note] of this.pendingUpdates.entries()) {
      if (!note || note.trashed) {
        this.onNoteDeleted(id);
      } else {
        this.onNoteUpdated(note);
      }
    }

    this.pendingUpdates.clear();
  }

  /**
   * Resolve a wiki-link target using the current index
   */
  public resolveLink(targetRaw: string, currentNoteId?: string): ResolvedLinkTarget {
    return PKMResolver.resolveLink(targetRaw, this.currentIndex, { currentNoteId });
  }

  /**
   * Get all backlinks referencing a specific note ID
   */
  public getBacklinks(noteId: string): PKMBacklink[] {
    return this.currentIndex.backlinks[noteId] || [];
  }

  /**
   * Get all outgoing target note IDs from a specific note ID
   */
  public getForwardLinks(noteId: string): string[] {
    return this.currentIndex.forwardLinks[noteId] || [];
  }

  /**
   * Get all unresolved links from a specific note ID
   */
  public getUnresolvedLinks(noteId: string): PKMWikiLink[] {
    return this.currentIndex.unresolvedLinks[noteId] || [];
  }

  /**
   * Get parsed note entry
   */
  public getParsedNote(noteId: string): ParsedNote | undefined {
    return this.currentIndex.notes[noteId];
  }

  /**
   * Subscribe to index changes
   */
  public subscribe(listener: IndexSubscriber): () => void {
    this.subscribers.add(listener);
    return () => {
      this.subscribers.delete(listener);
    };
  }

  private notifySubscribers(): void {
    for (const sub of this.subscribers) {
      try {
        sub(this.currentIndex);
      } catch (err) {
        console.error('Error in VaultIndex subscriber:', err);
      }
    }
  }
}

// Global Singleton Instance for easy app-wide sharing
export const vaultManager = new VaultIndexManager();
