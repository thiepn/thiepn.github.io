/**
 * V2.17 Note Revision & Knowledge History Engine
 * 
 * Manages discrete revision histories, autosave coalescing,
 * line-by-line diff generation, non-destructive revision restoration,
 * and archived note preservation.
 */

export interface NoteRevision {
  id: string;
  noteId: string;
  timestamp: string;
  author: string;
  content: string;
  summary?: string;
  charCount: number;
  wordCount: number;
}

export interface TextDiffChunk {
  type: 'added' | 'removed' | 'unchanged';
  line: string;
  lineNumberOld?: number;
  lineNumberNew?: number;
}

export class V2NoteHistoryEngine {
  private static instance: V2NoteHistoryEngine | null = null;
  private revisionStore: Map<string, NoteRevision[]> = new Map();
  private readonly maxRevisionsPerNote = 50;

  private constructor() {}

  public static getInstance(): V2NoteHistoryEngine {
    if (!V2NoteHistoryEngine.instance) {
      V2NoteHistoryEngine.instance = new V2NoteHistoryEngine();
    }
    return V2NoteHistoryEngine.instance;
  }

  /**
   * Records a new revision for a note, coalescing frequent edits within a short window.
   */
  public recordRevision(
    noteId: string,
    content: string,
    summary: string = 'Autosaved revision',
    coalesceWindowMs: number = 30000
  ): NoteRevision {
    const list = this.revisionStore.get(noteId) || [];
    const now = Date.now();
    const lastRev = list[list.length - 1];

    const words = content.trim().split(/\s+/).filter(Boolean).length;
    const chars = content.length;

    // Coalesce if within time window and content hasn't diverged massively
    if (lastRev && now - new Date(lastRev.timestamp).getTime() < coalesceWindowMs) {
      lastRev.content = content;
      lastRev.timestamp = new Date(now).toISOString();
      lastRev.summary = summary;
      lastRev.charCount = chars;
      lastRev.wordCount = words;
      return lastRev;
    }

    const newRev: NoteRevision = {
      id: `rev-${now}-${Math.random().toString(36).substring(2, 6)}`,
      noteId,
      timestamp: new Date(now).toISOString(),
      author: 'local_user',
      content,
      summary,
      charCount: chars,
      wordCount: words,
    };

    list.push(newRev);
    if (list.length > this.maxRevisionsPerNote) {
      list.shift(); // Evict oldest revision
    }
    this.revisionStore.set(noteId, list);
    return newRev;
  }

  public getRevisions(noteId: string): NoteRevision[] {
    return this.revisionStore.get(noteId) || [];
  }

  /**
   * Computes a line-by-line diff between two text strings.
   */
  public computeLineDiff(oldText: string, newText: string): TextDiffChunk[] {
    const oldLines = oldText.split('\n');
    const newLines = newText.split('\n');
    const chunks: TextDiffChunk[] = [];

    let i = 0;
    let j = 0;

    while (i < oldLines.length || j < newLines.length) {
      if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
        chunks.push({
          type: 'unchanged',
          line: oldLines[i],
          lineNumberOld: i + 1,
          lineNumberNew: j + 1,
        });
        i++;
        j++;
      } else if (j < newLines.length && (i >= oldLines.length || !oldLines.includes(newLines[j]))) {
        chunks.push({
          type: 'added',
          line: newLines[j],
          lineNumberNew: j + 1,
        });
        j++;
      } else if (i < oldLines.length) {
        chunks.push({
          type: 'removed',
          line: oldLines[i],
          lineNumberOld: i + 1,
        });
        i++;
      }
    }

    return chunks;
  }

  /**
   * Restores an older revision non-destructively by creating a new revision.
   */
  public restoreRevision(noteId: string, revisionId: string): { restoredContent: string; newRevision: NoteRevision } {
    const list = this.revisionStore.get(noteId) || [];
    const targetRev = list.find((r) => r.id === revisionId);

    if (!targetRev) {
      throw new Error(`Revision ${revisionId} not found for note ${noteId}`);
    }

    const restoredContent = targetRev.content;
    const newRev = this.recordRevision(noteId, restoredContent, `Restored from revision ${revisionId} (${targetRev.timestamp})`, 0);

    return {
      restoredContent,
      newRevision: newRev,
    };
  }
}

export const v2NoteHistoryEngine = V2NoteHistoryEngine.getInstance();
