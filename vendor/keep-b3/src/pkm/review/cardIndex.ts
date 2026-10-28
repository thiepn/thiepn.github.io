/**
 * Phase P38 - Review Card Index
 *
 * In-memory index derived from Markdown notes.
 * Provides fast lookups, sibling card grouping, tag indexing, and incremental updates.
 */

import { Note } from '../../types';
import { ReviewCard } from './reviewTypes';
import { extractCardsFromNote } from './cardParser';

export class CardIndex {
  private cardsById: Map<string, ReviewCard> = new Map();
  private cardsByNoteId: Map<string, ReviewCard[]> = new Map();
  private cardsByFolderId: Map<string, Set<string>> = new Map();
  private cardsByTag: Map<string, Set<string>> = new Map();
  private cardsBySiblingGroup: Map<string, Set<string>> = new Map();

  constructor() {
    this.clear();
  }

  public clear(): void {
    this.cardsById.clear();
    this.cardsByNoteId.clear();
    this.cardsByFolderId.clear();
    this.cardsByTag.clear();
    this.cardsBySiblingGroup.clear();
  }

  /**
   * Rebuild the entire card index from a collection of notes
   */
  public rebuild(notes: Note[]): void {
    this.clear();
    for (const note of notes) {
      if (!note.trashed) {
        this.indexNote(note);
      }
    }
  }

  /**
   * Incrementally update or index a single note's cards
   */
  public updateNote(note: Note): void {
    this.removeNote(note.id);
    if (!note.trashed) {
      this.indexNote(note);
    }
  }

  /**
   * Remove all indexed cards belonging to a specific note
   */
  public removeNote(noteId: string): void {
    const existingCards = this.cardsByNoteId.get(noteId) || [];
    for (const card of existingCards) {
      this.cardsById.delete(card.id);

      if (card.folderId) {
        const folderSet = this.cardsByFolderId.get(card.folderId);
        if (folderSet) {
          folderSet.delete(card.id);
          if (folderSet.size === 0) this.cardsByFolderId.delete(card.folderId);
        }
      }

      for (const tag of card.tags) {
        const tagSet = this.cardsByTag.get(tag.toLowerCase());
        if (tagSet) {
          tagSet.delete(card.id);
          if (tagSet.size === 0) this.cardsByTag.delete(tag.toLowerCase());
        }
      }

      if (card.isSiblingOf) {
        const sibSet = this.cardsBySiblingGroup.get(card.isSiblingOf);
        if (sibSet) {
          sibSet.delete(card.id);
          if (sibSet.size === 0) this.cardsBySiblingGroup.delete(card.isSiblingOf);
        }
      }
    }

    this.cardsByNoteId.delete(noteId);
  }

  private indexNote(note: Note): void {
    const cards = extractCardsFromNote(note);
    if (cards.length === 0) return;

    this.cardsByNoteId.set(note.id, cards);

    for (const card of cards) {
      this.cardsById.set(card.id, card);

      if (card.folderId) {
        let folderSet = this.cardsByFolderId.get(card.folderId);
        if (!folderSet) {
          folderSet = new Set();
          this.cardsByFolderId.set(card.folderId, folderSet);
        }
        folderSet.add(card.id);
      }

      for (const tag of card.tags) {
        const cleanTag = tag.replace(/^#/, '').toLowerCase();
        let tagSet = this.cardsByTag.get(cleanTag);
        if (!tagSet) {
          tagSet = new Set();
          this.cardsByTag.set(cleanTag, tagSet);
        }
        tagSet.add(card.id);
      }

      if (card.isSiblingOf) {
        let sibSet = this.cardsBySiblingGroup.get(card.isSiblingOf);
        if (!sibSet) {
          sibSet = new Set();
          this.cardsBySiblingGroup.set(card.isSiblingOf, sibSet);
        }
        sibSet.add(card.id);
      }
    }
  }

  // --- Query Methods ---

  public getAllCards(): ReviewCard[] {
    return Array.from(this.cardsById.values());
  }

  public getCard(cardId: string): ReviewCard | undefined {
    return this.cardsById.get(cardId);
  }

  public getCardsForNote(noteId: string): ReviewCard[] {
    return this.cardsByNoteId.get(noteId) || [];
  }

  public getCardsForFolder(folderId: string): ReviewCard[] {
    const cardIds = this.cardsByFolderId.get(folderId);
    if (!cardIds) return [];
    const results: ReviewCard[] = [];
    for (const id of cardIds) {
      const c = this.cardsById.get(id);
      if (c) results.push(c);
    }
    return results;
  }

  public getCardsForTag(tag: string): ReviewCard[] {
    const cleanTag = tag.replace(/^#/, '').toLowerCase();
    const cardIds = this.cardsByTag.get(cleanTag);
    if (!cardIds) return [];
    const results: ReviewCard[] = [];
    for (const id of cardIds) {
      const c = this.cardsById.get(id);
      if (c) results.push(c);
    }
    return results;
  }

  public getSiblingCardIds(cardId: string): string[] {
    const card = this.cardsById.get(cardId);
    if (!card || !card.isSiblingOf) return [];
    const group = this.cardsBySiblingGroup.get(card.isSiblingOf);
    if (!group) return [];
    return Array.from(group).filter((id) => id !== cardId);
  }

  public get totalCardsCount(): number {
    return this.cardsById.size;
  }
}

export const cardIndex = new CardIndex();
