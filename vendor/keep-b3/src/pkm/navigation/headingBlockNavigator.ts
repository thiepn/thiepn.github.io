import { Note } from '../../types';
import {
  HeadingJumpTarget,
  BlockJumpTarget,
  HeadingResolutionResult,
  InNoteFindMatch,
  InNoteFindState,
} from './navigationTypes';
import { slugify } from '../parser';
import { parseMarkdownSections, DocumentSection } from '../outliner';

export class HeadingBlockNavigator {
  /**
   * Extract all headings from note content with exact lines, levels, and slugs
   */
  public extractHeadings(content: string): HeadingJumpTarget[] {
    const headings: HeadingJumpTarget[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const headingText = match[2].trim();
        const slug = slugify(headingText);
        headings.push({
          headingText,
          level,
          lineIndex: i,
          slug,
        });
      }
    }

    return headings;
  }

  /**
   * Extract all block reference targets (e.g. lines with ^block-id at end)
   */
  public extractBlocks(content: string): BlockJumpTarget[] {
    const blocks: BlockJumpTarget[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/\s+\^([a-zA-Z0-9_-]+)$/);
      if (match) {
        const blockId = match[1];
        blocks.push({
          blockId,
          lineIndex: i,
          content: line.replace(/\s+\^[a-zA-Z0-9_-]+$/, '').trim(),
        });
      }
    }

    return blocks;
  }

  /**
   * Resolve heading reference against a note's current content
   */
  public resolveHeading(
    requestedHeading: string,
    content: string
  ): HeadingResolutionResult {
    const headings = this.extractHeadings(content);
    const cleanRequested = requestedHeading.trim();
    const reqSlug = slugify(cleanRequested);
    const reqLower = cleanRequested.toLowerCase();
    const normReq = reqLower.replace(/[-_]/g, ' ');

    // 1. Exact match (by text or slug)
    const exact = headings.find(
      (h) => h.headingText.toLowerCase() === reqLower || h.slug === reqSlug
    );
    if (exact) {
      return {
        status: 'exact',
        requestedHeading: cleanRequested,
        resolvedHeading: exact.headingText,
        resolvedLineIndex: exact.lineIndex,
      };
    }

    // 2. Fuzzy / nearby suggestions (e.g. if heading was renamed or edited slightly)
    const suggestions: Array<{ heading: HeadingJumpTarget; score: number }> = [];
    for (const h of headings) {
      const hLower = h.headingText.toLowerCase();
      const normH = hLower.replace(/[-_]/g, ' ');

      let score = 0;
      if (normH.includes(normReq) || normReq.includes(normH)) {
        score = 90;
      } else if (hLower.includes(reqLower) || reqLower.includes(hLower)) {
        score = 80;
      } else if (this.levenshteinSimilarity(normH, normReq) > 0.45) {
        score = 65;
      }
      if (score > 0) {
        suggestions.push({ heading: h, score });
      }
    }

    suggestions.sort((a, b) => b.score - a.score);

    if (suggestions.length > 0 && suggestions[0].score >= 65) {
      return {
        status: 'fuzzy_renamed',
        requestedHeading: cleanRequested,
        resolvedHeading: suggestions[0].heading.headingText,
        resolvedLineIndex: suggestions[0].heading.lineIndex,
        nearbySuggestions: suggestions.map((s) => s.heading.headingText),
      };
    }

    return {
      status: 'missing',
      requestedHeading: cleanRequested,
      nearbySuggestions: headings.map((h) => h.headingText).slice(0, 5),
    };
  }

  /**
   * Generate portable markdown links for headings and blocks
   */
  public formatHeadingLink(noteTitle: string, headingText: string): string {
    return `[[${noteTitle}#${headingText}]]`;
  }

  public formatBlockLink(noteTitle: string, blockId: string): string {
    return `[[${noteTitle}#^${blockId}]]`;
  }

  /**
   * In-Note Find execution across lines with folded section detection
   */
  public findInNote(
    content: string,
    query: string,
    options?: { caseSensitive?: boolean; foldedSectionIds?: string[] }
  ): InNoteFindState {
    const rawQuery = query.trim();
    if (!rawQuery) {
      return {
        query: '',
        matches: [],
        activeMatchIndex: -1,
        caseSensitive: options?.caseSensitive || false,
      };
    }

    const caseSensitive = options?.caseSensitive || false;
    const searchTarget = caseSensitive ? rawQuery : rawQuery.toLowerCase();
    const lines = content.split('\n');
    const matches: InNoteFindMatch[] = [];

    const { flatSections } = parseMarkdownSections(content);
    let matchIdx = 0;

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx];
      const compLine = caseSensitive ? line : line.toLowerCase();
      let startPos = 0;

      while ((startPos = compLine.indexOf(searchTarget, startPos)) !== -1) {
        // Find which section this line belongs to
        const parentSection = flatSections.find(
          (s) => lineIdx >= s.startLine && lineIdx <= s.endLine
        );

        matches.push({
          index: matchIdx++,
          lineIndex: lineIdx,
          charStart: startPos,
          charEnd: startPos + rawQuery.length,
          text: line.slice(startPos, startPos + rawQuery.length),
          isFolded: parentSection
            ? options?.foldedSectionIds?.includes(parentSection.id)
            : false,
          sectionId: parentSection?.id,
        });

        startPos += rawQuery.length;
      }
    }

    return {
      query: rawQuery,
      matches,
      activeMatchIndex: matches.length > 0 ? 0 : -1,
      caseSensitive,
    };
  }


  private levenshteinSimilarity(s1: string, s2: string): number {
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    if (longer.length === 0) return 1.0;

    const costs = [];
    for (let i = 0; i <= longer.length; i++) {
      let lastVal = i;
      for (let j = 0; j <= shorter.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          let newVal = costs[j - 1];
          if (longer.charAt(i - 1) !== shorter.charAt(j - 1)) {
            newVal = Math.min(Math.min(newVal, lastVal), costs[j]) + 1;
          }
          costs[j - 1] = lastVal;
          lastVal = newVal;
        }
      }
      if (i > 0) costs[shorter.length] = lastVal;
    }

    return (longer.length - costs[shorter.length]) / longer.length;
  }
}

export const headingBlockNavigator = new HeadingBlockNavigator();
