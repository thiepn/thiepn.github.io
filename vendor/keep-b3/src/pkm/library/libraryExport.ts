/**
 * Phase P52 — Library Import, Export & Publishing Safety Service
 *
 * Supports CSV export/import (including standard reading trackers & Goodreads CSV format),
 * JSON vault backup, and Markdown highlight exports.
 * Strictly guarantees that publication workflows only export user-authored notes/excerpts
 * and never raw copyrighted book binaries.
 */

import { LibraryItem, SourceHighlight, ReadingSession } from './libraryTypes';
import { libraryStorage } from './libraryStorage';
import { libraryHighlightService } from './libraryHighlightService';

export class LibraryExportService {
  /**
   * Exports library items as portable CSV.
   */
  public static exportToCsv(items: LibraryItem[]): string {
    const headers = [
      'Title',
      'Creators',
      'Type',
      'Format',
      'Status',
      'Progress',
      'Rating',
      'ISBN',
      'Publisher',
      'PublishedDate',
      'FinishedDate',
      'URL',
    ];

    const rows = items.map((item) => {
      const creators = (item.creators || []).map((c) => c.name).join('; ');
      const progress =
        item.progress?.mode === 'page'
          ? `${item.progress.currentPage || 0}/${item.progress.totalPages || 0}`
          : item.progress?.percent !== undefined
          ? `${item.progress.percent}%`
          : '';
      const finishedDate = item.currentCycle?.finishedAt || '';

      return [
        `"${(item.title || '').replace(/"/g, '""')}"`,
        `"${creators.replace(/"/g, '""')}"`,
        `"${item.type}"`,
        `"${item.format || ''}"`,
        `"${item.status}"`,
        `"${progress}"`,
        `"${item.metadata?.rating || ''}"`,
        `"${item.metadata?.isbn || ''}"`,
        `"${(item.metadata?.publisher || '').replace(/"/g, '""')}"`,
        `"${item.metadata?.publicationDate || ''}"`,
        `"${finishedDate}"`,
        `"${item.sourceUrl || ''}"`,
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Imports items from standard or Goodreads CSV.
   */
  public static importFromCsv(csvText: string): Array<Partial<LibraryItem>> {
    const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) return [];

    const header = lines[0].toLowerCase();
    const isGoodreads = header.includes('book id') || header.includes('my rating') || header.includes('read count');

    const imported: Array<Partial<LibraryItem>> = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // Regex CSV parser handling quotes
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let c = 0; c < line.length; c++) {
        const char = line[c];
        if (char === '"') {
          if (inQuotes && line[c + 1] === '"') {
            current += '"';
            c++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());

      if (isGoodreads) {
        // Goodreads mapping: Title(1), Author(2), ISBN(5), My Rating(7), Exclusive Shelf(18), Date Read(14)
        const title = values[1] || 'Untitled';
        const author = values[2] || '';
        const isbn = values[5]?.replace(/[="]/g, '') || '';
        const rating = parseInt(values[7], 10) || undefined;
        const shelf = (values[18] || '').toLowerCase();
        const dateRead = values[14] || '';

        let status: LibraryItem['status'] = 'inbox';
        if (shelf === 'currently-reading') status = 'in-progress';
        else if (shelf === 'read') status = 'finished';
        else if (shelf === 'to-read') status = 'queued';

        imported.push({
          type: 'book',
          title,
          creators: author ? [{ name: author, role: 'author' }] : [],
          status,
          metadata: {
            isbn: isbn || undefined,
            rating: rating && rating > 0 ? rating : undefined,
          },
          currentCycle: {
            id: 'cycle-1',
            cycleNumber: 1,
            finishedAt: dateRead || undefined,
          },
        });
      } else {
        // Standard CSV: Title(0), Creators(1), Type(2), Format(3), Status(4)
        const title = values[0] || 'Untitled';
        const creatorsRaw = values[1] || '';
        const type = (values[2] || 'book') as any;
        const format = (values[3] || 'other') as any;
        const status = (values[4] || 'inbox') as any;

        const creators = creatorsRaw
          .split(';')
          .map((c) => c.trim())
          .filter(Boolean)
          .map((name) => ({ name, role: 'author' as const }));

        imported.push({
          type,
          format,
          title,
          creators,
          status,
        });
      }
    }

    return imported;
  }

  /**
   * Exports all highlights for an item in clean, cited Markdown format.
   */
  public static exportHighlightsToMarkdown(item: LibraryItem): string {
    const highlights = libraryHighlightService.getHighlightsForItem(item);
    const authorStr = item.creators.map((c) => c.name).join(', ');

    let md = `# Highlights & Excerpts: ${item.title}\n\n`;
    if (authorStr) md += `**Author(s)**: ${authorStr}\n\n`;
    md += `*Generated from Library on ${new Date().toLocaleDateString()}*\n\n---\n\n`;

    if (highlights.length === 0) {
      md += `*No highlights recorded for this work.*\n`;
      return md;
    }

    for (const hl of highlights) {
      const formatted = libraryHighlightService.formatQuoteWithProvenance(hl, item);
      md += `${formatted}\n\n`;
      if (hl.annotation) {
        md += `**Note**: ${hl.annotation}\n\n`;
      }
      md += `---\n\n`;
    }

    return md;
  }

  /**
   * Exports entire library as portable JSON backup.
   */
  public static exportToJson(): string {
    const items = libraryStorage.getItems();
    const highlights = libraryStorage.getHighlights();
    const sessions = libraryStorage.getSessions();

    return JSON.stringify(
      {
        version: 1,
        exportedAt: new Date().toISOString(),
        items,
        highlights,
        sessions,
      },
      null,
      2
    );
  }

  /**
   * Publication Safety Sanitizer
   * Guarantees that binary attachments (EPUB/PDF/audio) and private highlights
   * are never exported into public static sites.
   */
  public static getPublicExportPayload(item: LibraryItem, userNoteContent?: string): {
    title: string;
    creators: string[];
    type: string;
    sourceUrl?: string;
    publicNoteContent?: string;
  } {
    return {
      title: item.title,
      creators: item.creators.map((c) => c.name),
      type: item.type,
      sourceUrl: item.sourceUrl,
      publicNoteContent: userNoteContent || undefined,
    };
  }
}
