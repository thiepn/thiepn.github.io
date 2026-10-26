import { Note, Folder } from '../../types';
import {
  ExtractionRequest,
  ExtractionValidation,
  ExtractionResult,
} from './extractionTypes';
import { vaultManager } from '../indexer';

export class ExtractionService {
  /**
   * Deterministically suggests a clean note title from selected Markdown text.
   * Priority:
   * 1. Top-level heading (# or ##) in the selection
   * 2. First non-empty sentence or line
   * 3. Cleaned first phrase (max ~50 chars)
   */
  public suggestTitle(selection: string): string {
    if (!selection || !selection.trim()) return '';

    const lines = selection.trim().split('\n');

    // 1. Look for heading in selection
    for (const line of lines) {
      const trimmed = line.trim();
      const headingMatch = trimmed.match(/^#{1,6}\s+(.+)$/);
      if (headingMatch && headingMatch[1].trim()) {
        return this.cleanTitleText(headingMatch[1]);
      }
    }

    // 2. Look for first non-empty text line
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Clean list markers, blockquotes, callout headers
      const cleaned = trimmed
        .replace(/^[-*+]\s+(\[[ xX]\]\s+)?/, '')
        .replace(/^\d+\.\s+/, '')
        .replace(/^>\s*(\[[!a-zA-Z_-]+\])?\s*/, '')
        .replace(/^```[a-zA-Z0-9_-]*/, '')
        .trim();

      if (cleaned) {
        // Take first sentence or first 50 chars
        const sentenceEnd = cleaned.search(/[.!?](?:\s|$)/);
        const candidate = sentenceEnd > 0 && sentenceEnd <= 60
          ? cleaned.slice(0, sentenceEnd)
          : cleaned;

        const result = this.cleanTitleText(candidate);
        if (result) return result;
      }
    }

    return 'Extracted Note';
  }

  /**
   * Strips markdown inline markup and illegal characters to produce a clean title.
   */
  public cleanTitleText(text: string): string {
    return text
      .replace(/\[\[(.*?)\]\]/g, '$1') // unwrap wikilinks
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // unwrap md links
      .replace(/[*_~`#$]/g, '') // remove markdown symbols
      .replace(/[\\/:*?"<>|]/g, ' ') // replace illegal filesystem chars with space
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 60);
  }

  /**
   * Sanitizes proposed title.
   */
  public sanitizeTitle(title: string): string {
    return this.cleanTitleText(title);
  }

  /**
   * Validates proposed extraction request against current vault notes.
   */
  public validate(
    selection: string,
    proposedTitle: string,
    allNotes: Note[]
  ): ExtractionValidation {
    const trimmedSelection = selection ? selection.trim() : '';
    if (!trimmedSelection) {
      return {
        valid: false,
        suggestedTitle: '',
        sanitizedTitle: '',
        isDuplicate: false,
        error: 'Select some content to extract.',
      };
    }

    const sanitizedTitle = this.sanitizeTitle(proposedTitle || this.suggestTitle(selection));
    if (!sanitizedTitle) {
      return {
        valid: false,
        suggestedTitle: this.suggestTitle(selection),
        sanitizedTitle: '',
        isDuplicate: false,
        error: 'Please provide a valid note title.',
      };
    }

    // Check for duplicate title (case-insensitive)
    const existing = allNotes.find(
      (n) => (n.title || '').trim().toLowerCase() === sanitizedTitle.toLowerCase() && !n.trashed
    );

    return {
      valid: true,
      suggestedTitle: this.suggestTitle(selection),
      sanitizedTitle,
      isDuplicate: !!existing,
      existingNote: existing,
    };
  }

  /**
   * Executes atomic extraction:
   * 1. Prepares target note with exact extracted Markdown.
   * 2. Replaces selected source range with Wikilink or Transclusion.
   * 3. Commits target note and updated source note.
   */
  public async executeExtraction(
    request: ExtractionRequest,
    createNoteFn: (noteData: Partial<Note>) => Promise<Note | null> | Note | null,
    saveNoteFn: (updatedNote: Note) => void | Promise<void>
  ): Promise<ExtractionResult> {
    const {
      sourceNote,
      selectionText,
      selectionStart,
      selectionEnd,
      targetTitle,
      targetFolderId,
      mode,
      customAlias,
      addSourceContextMetadata,
    } = request;

    const sanitizedTitle = this.sanitizeTitle(targetTitle);
    if (!sanitizedTitle) {
      return {
        success: false,
        replacementText: '',
        error: 'Target note title cannot be empty.',
      };
    }

    // 1. Build target note content
    let targetContent = selectionText;

    // Preserve exact source Markdown without html loss
    if (addSourceContextMetadata && sourceNote.title) {
      const frontmatter = `---\nsource: "[[${sourceNote.title}]]"\nextracted_at: ${new Date().toISOString()}\n---\n\n`;
      targetContent = frontmatter + targetContent;
    }

    // 2. Prepare replacement text in source note
    let replacementText = '';
    if (mode === 'embed') {
      replacementText = `![[${sanitizedTitle}]]`;
    } else {
      // Link mode
      if (customAlias && customAlias.trim() && customAlias.trim() !== sanitizedTitle) {
        replacementText = `[[${sanitizedTitle}|${customAlias.trim()}]]`;
      } else {
        replacementText = `[[${sanitizedTitle}]]`;
      }
    }

    try {
      // 3. Create target note
      const newNoteData: Partial<Note> = {
        title: sanitizedTitle,
        content: targetContent,
        folderId: targetFolderId !== undefined ? targetFolderId : (sourceNote.folderId || null),
        tags: [],
        color: sourceNote.color || 'default',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const createdTargetNote = await createNoteFn(newNoteData);
      if (!createdTargetNote) {
        return {
          success: false,
          replacementText: '',
          error: 'Failed to create target note. Source content was preserved untouched.',
        };
      }

      // 4. Update source note
      const originalSourceContent = sourceNote.content || '';
      let updatedContent = '';

      if (
        selectionStart >= 0 &&
        selectionEnd <= originalSourceContent.length &&
        selectionStart <= selectionEnd
      ) {
        const before = originalSourceContent.slice(0, selectionStart);
        const after = originalSourceContent.slice(selectionEnd);
        updatedContent = before + replacementText + after;
      } else {
        // Fallback: replace first occurrence of selectionText if offsets out of bounds
        const idx = originalSourceContent.indexOf(selectionText);
        if (idx !== -1) {
          updatedContent =
            originalSourceContent.slice(0, idx) +
            replacementText +
            originalSourceContent.slice(idx + selectionText.length);
        } else {
          updatedContent = originalSourceContent + '\n\n' + replacementText;
        }
      }

      const updatedSourceNote: Note = {
        ...sourceNote,
        content: updatedContent,
        updatedAt: new Date().toISOString(),
      };

      await saveNoteFn(updatedSourceNote);

      return {
        success: true,
        targetNote: createdTargetNote,
        updatedSourceNote,
        replacementText,
      };
    } catch (err: any) {
      console.error('[ExtractionService] Error during atomic extraction:', err);
      return {
        success: false,
        replacementText: '',
        error: err.message || 'An unexpected error occurred during extraction.',
      };
    }
  }
}

export const extractionService = new ExtractionService();
