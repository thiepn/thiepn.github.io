import { Note } from '../../types';
import { CitationProvenanceItem } from './navigationTypes';

export class ResearchNavigationService {
  /**
   * Parse citation markers in note content (e.g. [@einstein1905], [@knuth1984, p. 42])
   */
  public extractCitations(content: string): CitationProvenanceItem[] {
    const citations: CitationProvenanceItem[] = [];
    const regex = /\[@([a-zA-Z0-9_-]+)(?:,\s*p(?:p)?\.\s*(\d+))?\]/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(content)) !== null) {
      const citeKey = match[1];
      const pageNum = match[2] ? parseInt(match[2], 10) : undefined;

      citations.push({
        citeKey,
        referenceTitle: citeKey,
        pdfPage: pageNum,
      });
    }

    return citations;
  }

  /**
   * Format source provenance string for note headers or citation callouts
   */
  public formatSourceProvenance(item: CitationProvenanceItem): string {
    const parts: string[] = [];
    if (item.pdfTitle) {
      parts.push(`Source: ${item.pdfTitle}`);
    } else {
      parts.push(`Source: @${item.citeKey}`);
    }

    if (item.pdfPage) {
      parts.push(`p. ${item.pdfPage}`);
    }

    if (item.authors && item.authors.length > 0) {
      parts.push(`(${item.authors.join(', ')}${item.year ? ` ${item.year}` : ''})`);
    }

    return parts.join(' · ');
  }

  /**
   * Find all notes citing a given reference/citeKey
   */
  public findCitingNotes(citeKey: string, notes: Note[]): Note[] {
    const pattern = `[@${citeKey}`;
    return notes.filter((n) => !n.trashed && (n.content || '').includes(pattern));
  }
}

export const researchNavigationService = new ResearchNavigationService();
