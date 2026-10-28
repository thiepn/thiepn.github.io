/**
 * Phase P52 — Unified Source Highlights & Knowledge Extraction Engine
 *
 * Provides a unified abstraction over PDF annotations (P26), EPUB highlights,
 * manual book quotes, web captures, and audio/video timestamps with full provenance.
 */

import { SourceHighlight, SourceLocator, HighlightColor, HighlightProcessingStatus, LibraryItem } from './libraryTypes';
import { libraryStorage } from './libraryStorage';
import { referenceStorageService } from '../reference/referenceStorageService';

export class LibraryHighlightService {
  /**
   * Returns all highlights for a given Library Item.
   */
  public getHighlightsForItem(item: LibraryItem): SourceHighlight[] {
    const nativeHighlights = libraryStorage.getHighlights(item.id);

    // Sort by location / date
    return [...nativeHighlights].sort((a, b) => {
      if (a.locator.page && b.locator.page) return a.locator.page - b.locator.page;
      return b.createdAt - a.createdAt;
    });
  }

  /**
   * Retrieves all highlights across the entire library for global searching and review.
   */
  public getAllHighlights(items: LibraryItem[]): SourceHighlight[] {
    const itemMap = new Map<string, LibraryItem>(items.map((i) => [i.id, i]));
    const nativeHighlights = libraryStorage.getHighlights();
    return nativeHighlights.filter((hl) => itemMap.has(hl.libraryItemId));
  }

  /**
   * Adds a new manual, EPUB, or timestamp highlight to a Library Item.
   */
  public addHighlight(
    libraryItemId: string,
    text: string,
    sourceType: SourceHighlight['sourceType'],
    locator: SourceLocator,
    annotation?: string,
    color: HighlightColor = 'yellow',
    tags?: string[]
  ): SourceHighlight {
    const id = `hl-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const highlight: SourceHighlight = {
      id,
      libraryItemId,
      sourceType,
      text: text.trim(),
      locator,
      annotation: annotation?.trim() || undefined,
      color,
      tags: tags || [],
      status: 'unprocessed',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    libraryStorage.saveHighlight(highlight);
    return highlight;
  }

  /**
   * Updates an existing native highlight.
   */
  public updateHighlight(
    highlightId: string,
    updates: Partial<Omit<SourceHighlight, 'id' | 'libraryItemId' | 'createdAt'>>
  ): SourceHighlight | null {
    const existing = libraryStorage.getHighlight(highlightId);
    if (!existing) return null;

    const updated: SourceHighlight = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    };
    libraryStorage.saveHighlight(updated);
    return updated;
  }

  /**
   * Deletes a highlight.
   */
  public deleteHighlight(highlightId: string): boolean {
    return libraryStorage.deleteHighlight(highlightId);
  }

  /**
   * Formats a quote with accurate citation provenance for clipboard copying or Markdown insertion.
   */
  public formatQuoteWithProvenance(highlight: SourceHighlight, item: LibraryItem): string {
    const authorStr = item.creators && item.creators.length > 0 ? item.creators.map((c) => c.name).join(', ') : '';
    const locStr = highlight.locator.locationText || (highlight.locator.page ? `p. ${highlight.locator.page}` : '');

    // Check if item is linked to a P35 Reference
    if (item.referenceId) {
      const ref = referenceStorageService.getReferenceById(item.referenceId);
      if (ref && ref.citationKey) {
        const citationTag = locStr ? `[@${ref.citationKey}, ${locStr}]` : `[@${ref.citationKey}]`;
        return `> ${highlight.text}\n\n${citationTag}`;
      }
    }

    // Standard author + title + location format
    let attribution = '';
    if (authorStr && item.title) {
      attribution = `— ${authorStr}, *${item.title}*${locStr ? `, ${locStr}` : ''}`;
    } else if (item.title) {
      attribution = `— *${item.title}*${locStr ? `, ${locStr}` : ''}`;
    }

    if (attribution) {
      return `> ${highlight.text}\n\n${attribution}`;
    }

    return `> ${highlight.text}`;
  }

  /**
   * Generates a canonical atomic note draft from a highlight.
   */
  public generateAtomicNoteFromHighlight(
    highlight: SourceHighlight,
    item: LibraryItem
  ): {
    title: string;
    content: string;
    tags: string[];
  } {
    // Title derived from annotation or first words of quote
    let title = highlight.annotation
      ? highlight.annotation.slice(0, 50).trim()
      : highlight.text.slice(0, 50).trim();
    if (title.length >= 50) title += '...';

    const provenanceLink = `library://item/${item.id}#highlight=${highlight.id}`;
    const formattedQuote = this.formatQuoteWithProvenance(highlight, item);

    let content = `# ${title}\n\n${formattedQuote}\n\n`;

    if (highlight.annotation) {
      content += `## Personal Notes & Reflection\n\n${highlight.annotation}\n\n`;
    }

    content += `## Source Provenance\n\n- **Source Work**: [[${item.title}]]\n- **Locator**: ${highlight.locator.locationText || (highlight.locator.page ? `p. ${highlight.locator.page}` : 'N/A')}\n- **Resource Link**: \`${provenanceLink}\`\n\n## Related Concepts\n\n`;

    return {
      title,
      content,
      tags: ['highlight', 'reading', item.type, ...(highlight.tags || [])],
    };
  }

  /**
   * Generates a Spaced Repetition flashcard proposal payload from a highlight.
   */
  public generateFlashcardProposal(
    highlight: SourceHighlight,
    item: LibraryItem
  ): {
    question: string;
    answer: string;
    sourceRef: string;
  } {
    const question = highlight.annotation
      ? `What is the key idea behind: "${highlight.annotation}"?`
      : `Complete the key quote / concept from ${item.title}:`;

    const answer = highlight.text;
    const sourceRef = `${item.title}${highlight.locator.locationText ? ` (${highlight.locator.locationText})` : ''}`;

    return {
      question,
      answer,
      sourceRef,
    };
  }
}

export const libraryHighlightService = new LibraryHighlightService();
