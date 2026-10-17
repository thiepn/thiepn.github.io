import { Note, Folder } from '../../types';
import { parseTextWithWikiLinks } from '../../utils/linking';

export interface BrokenLinkItem {
  sourceNoteId: string;
  sourceNoteTitle: string;
  targetTitle: string;
  lineSnippet: string;
}

export interface OrphanNoteItem {
  noteId: string;
  noteTitle: string;
  wordCount: number;
  updatedAt: string;
}

export interface VaultHealthReport {
  healthScore: number; // 0 to 100
  totalNotes: number;
  totalLinks: number;
  brokenLinks: BrokenLinkItem[];
  orphanNotes: OrphanNoteItem[];
  danglingTags: string[];
  totalWords: number;
  generatedAt: string;
}

class VaultHealthService {
  public scanVault(notes: Note[]): VaultHealthReport {
    const activeNotes = notes.filter((n) => !n.trashed);
    const titleToNoteMap = new Map<string, Note>();
    const incomingLinkCounts = new Map<string, number>();
    const outgoingLinkCounts = new Map<string, number>();

    activeNotes.forEach((n) => {
      titleToNoteMap.set(n.title.trim().toLowerCase(), n);
      incomingLinkCounts.set(n.id, 0);
      outgoingLinkCounts.set(n.id, 0);
    });

    const brokenLinks: BrokenLinkItem[] = [];
    let totalLinks = 0;
    let totalWords = 0;

    // Scan links in all notes
    activeNotes.forEach((note) => {
      const content = note.content || '';
      const words = content.trim() ? content.trim().split(/\s+/).length : 0;
      totalWords += words;

      // Extract [[wiki-links]]
      const matches = content.matchAll(/\[\[(.*?)\]\]/g);
      let noteOutgoing = 0;

      for (const m of matches) {
        totalLinks += 1;
        noteOutgoing += 1;
        const rawTarget = m[1].split('|')[0].split('#')[0].trim();
        const targetLower = rawTarget.toLowerCase();

        if (titleToNoteMap.has(targetLower)) {
          const targetNote = titleToNoteMap.get(targetLower)!;
          incomingLinkCounts.set(
            targetNote.id,
            (incomingLinkCounts.get(targetNote.id) || 0) + 1
          );
        } else {
          // Find context snippet around the match
          const index = m.index ?? 0;
          const start = Math.max(0, index - 25);
          const end = Math.min(content.length, index + m[0].length + 25);
          const lineSnippet = `...${content.slice(start, end).replace(/\n/g, ' ')}...`;

          brokenLinks.push({
            sourceNoteId: note.id,
            sourceNoteTitle: note.title || 'Untitled',
            targetTitle: rawTarget,
            lineSnippet,
          });
        }
      }

      outgoingLinkCounts.set(note.id, noteOutgoing);
    });

    // Detect orphan notes (0 incoming & 0 outgoing)
    const orphanNotes: OrphanNoteItem[] = activeNotes
      .filter((n) => {
        const incoming = incomingLinkCounts.get(n.id) || 0;
        const outgoing = outgoingLinkCounts.get(n.id) || 0;
        return incoming === 0 && outgoing === 0;
      })
      .map((n) => ({
        noteId: n.id,
        noteTitle: n.title || 'Untitled',
        wordCount: (n.content || '').trim().split(/\s+/).filter(Boolean).length,
        updatedAt: n.updatedAt,
      }));

    // Find dangling tags (tags that exist on 0 notes)
    const tagCount = new Map<string, number>();
    activeNotes.forEach((n) => {
      n.tags?.forEach((t) => tagCount.set(t, (tagCount.get(t) || 0) + 1));
    });
    const danglingTags = Array.from(tagCount.entries())
      .filter(([_, count]) => count === 0)
      .map(([tag]) => tag);

    // Calculate overall Health Score
    // Penalty: 3 points per broken link, 1 point per 2 orphan notes, floor at 10
    const brokenLinkPenalty = brokenLinks.length * 4;
    const orphanPenalty = Math.floor(orphanNotes.length * 0.5);
    const healthScore = Math.max(10, Math.min(100, 100 - brokenLinkPenalty - orphanPenalty));

    return {
      healthScore,
      totalNotes: activeNotes.length,
      totalLinks,
      brokenLinks,
      orphanNotes,
      danglingTags,
      totalWords,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generates a new note stub to heal a broken wiki-link
   */
  public createStubNoteForBrokenLink(
    targetTitle: string,
    sourceNoteTitle: string
  ): Partial<Note> {
    return {
      id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: targetTitle,
      content: `# ${targetTitle}\n\n*Created via Vault Health Doctor to resolve broken backlink from [[${sourceNoteTitle}]].*\n`,
      type: 'text',
      checklist: [],
      tags: ['vault-doctor', 'stub'],
      color: 'default',
      folderId: null,
      pinned: false,
      archived: false,
      trashed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Removes a broken link in a note's content by replacing [[target]] with target text
   */
  public healBrokenLinkInContent(content: string, targetTitle: string): string {
    const escaped = targetTitle.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    const regex = new RegExp(`\\[\\[${escaped}(?:\\|[^\\]]+)?\\]\\]`, 'g');
    return content.replace(regex, targetTitle);
  }
}

export const vaultHealthService = new VaultHealthService();
