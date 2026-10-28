/**
 * Phase P38 - Review System Diagnostics & Vault Doctor Integration
 *
 * Scans vault for duplicate card IDs, orphan review states, and malformed cloze syntax.
 * Provides automated, lossless repair routines.
 */

import { Note } from '../../types';
import { DiagnosticIssue, DiagnosticAction } from '../doctorTypes';
import { extractCardsFromNote, regenerateCardIdsInMarkdown } from './cardParser';
import { reviewStorageService } from './reviewStorageService';
import { cardIndex } from './cardIndex';

export interface ReviewDiagnosticsResult {
  issues: DiagnosticIssue[];
  duplicateIdMap: Map<string, Array<{ noteId: string; noteTitle: string }>>;
  orphanCardIds: string[];
}

export class ReviewDoctor {
  /**
   * Run full diagnostics check on all review cards and scheduling states
   */
  public diagnoseReviewSystem(notes: Note[]): ReviewDiagnosticsResult {
    const issues: DiagnosticIssue[] = [];
    const idToNotesMap = new Map<string, Array<{ noteId: string; noteTitle: string }>>();
    const allParsedCardIds = new Set<string>();

    // 1. Scan notes for card definitions and duplicate explicit card IDs
    for (const note of notes) {
      if (note.trashed) continue;
      const cards = extractCardsFromNote(note);

      for (const card of cards) {
        allParsedCardIds.add(card.id);

        if (card.sourceBlockId) {
          const list = idToNotesMap.get(card.sourceBlockId) || [];
          list.push({ noteId: note.id, noteTitle: note.title || 'Untitled' });
          idToNotesMap.set(card.sourceBlockId, list);
        }
      }

      // Check for malformed cloze syntax e.g. {{c:: or {{cX::
      const malformedCloze = note.content.match(/\{\{c[^\d:][^:]*::/g);
      if (malformedCloze) {
        const actions: DiagnosticAction[] = [
          {
            id: `open-note-${note.id}`,
            label: 'Open Note to Edit Cloze',
            description: 'Navigate to note containing malformed cloze syntax',
            actionType: 'open_note',
            params: { noteId: note.id },
          },
        ];

        issues.push({
          id: `malformed-cloze-${note.id}`,
          category: 'review_system',
          type: 'malformed_cloze_syntax',
          severity: 'warning',
          title: `Malformed Cloze Syntax in "${note.title || 'Untitled'}"`,
          description: `Note contains cloze markup with non-numeric index: ${malformedCloze.join(', ')}. Use standard format like {{c1::hidden text}}.`,
          sourceId: note.id,
          sourceName: note.title || 'Untitled',
          suggestedActions: actions,
        });
      }
    }

    // 2. Identify duplicate card IDs across notes
    for (const [cardId, occurrences] of idToNotesMap.entries()) {
      if (occurrences.length > 1) {
        const noteTitles = occurrences.map((o) => `"${o.noteTitle}"`).join(', ');
        const actions: DiagnosticAction[] = occurrences.map((occ, idx) => ({
          id: `regen-card-ids-${occ.noteId}-${idx}`,
          label: `Regenerate IDs in "${occ.noteTitle}"`,
          description: `Assign fresh unique IDs to cards in "${occ.noteTitle}"`,
          actionType: 'repair_duplicate_card_ids',
          params: { noteId: occ.noteId },
        }));

        issues.push({
          id: `duplicate-card-id-${cardId}`,
          category: 'review_system',
          type: 'duplicate_card_id',
          severity: 'error',
          title: `Duplicate Card ID: ^card-${cardId.replace(/^card-/, '')}`,
          description: `Card ID ^${cardId} is declared in multiple notes (${noteTitles}). This causes review state collisions.`,
          sourceId: occurrences[0].noteId,
          sourceName: occurrences[0].noteTitle,
          suggestedActions: actions,
        });
      }
    }

    // 3. Identify orphan review states in storage
    const allStoredStates = reviewStorageService.getAllCardStates();
    const orphanCardIds: string[] = [];

    for (const cardId of allStoredStates.keys()) {
      if (!allParsedCardIds.has(cardId)) {
        orphanCardIds.push(cardId);
      }
    }

    if (orphanCardIds.length > 0) {
      const actions: DiagnosticAction[] = [
        {
          id: `prune-orphans`,
          label: `Prune ${orphanCardIds.length} Orphan State${orphanCardIds.length > 1 ? 's' : ''}`,
          description: 'Remove obsolete card review records from browser storage',
          actionType: 'clean_orphan_review_states',
          isDestructive: true,
          params: { orphanCardIds },
        },
      ];

      issues.push({
        id: `orphan-review-states`,
        category: 'review_system',
        type: 'orphan_review_state',
        severity: 'info',
        title: `${orphanCardIds.length} Orphan Review State${orphanCardIds.length > 1 ? 's' : ''}`,
        description: `Found ${orphanCardIds.length} review states for cards that were deleted or edited out of notes.`,
        suggestedActions: actions,
      });
    }

    return {
      issues,
      duplicateIdMap: idToNotesMap,
      orphanCardIds,
    };
  }

  /**
   * Repair duplicate card IDs in a note by rewriting all card block IDs
   */
  public repairDuplicateCardIds(noteContent: string): string {
    return regenerateCardIdsInMarkdown(noteContent);
  }

  /**
   * Prune orphan review states from storage
   */
  public async pruneOrphanReviewStates(orphanCardIds: string[]): Promise<void> {
    await reviewStorageService.resetMultipleCards(orphanCardIds);
  }
}

export const reviewDoctor = new ReviewDoctor();
export const diagnoseReviewSystem = (notes: Note[]) => reviewDoctor.diagnoseReviewSystem(notes);

