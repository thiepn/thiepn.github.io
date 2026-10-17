import { Note, Folder } from '../../types';
import { FlashbackItem, FlashbackWindowKey, FlashbackPreferences } from './flashbackTypes';
import { vaultManager } from '../indexer';

const FLASHBACK_STORAGE_KEY = 'pkm_flashback_preferences_v1';

export class FlashbackService {
  private preferences: FlashbackPreferences = {
    dismissedNoteIds: [],
  };

  constructor() {
    this.loadPreferences();
  }

  private loadPreferences() {
    try {
      const raw = localStorage.getItem(FLASHBACK_STORAGE_KEY);
      if (raw) {
        this.preferences = JSON.parse(raw);
      }
    } catch (e) {
      console.warn('[FlashbackService] Failed to load preferences:', e);
    }
  }

  private savePreferences() {
    try {
      localStorage.setItem(FLASHBACK_STORAGE_KEY, JSON.stringify(this.preferences));
    } catch (e) {
      console.warn('[FlashbackService] Failed to save preferences:', e);
    }
  }

  public dismissNote(noteId: string) {
    if (!this.preferences.dismissedNoteIds.includes(noteId)) {
      this.preferences.dismissedNoteIds.push(noteId);
      this.preferences.lastUpdated = new Date().toISOString();
      this.savePreferences();
    }
  }

  public resetDismissals() {
    this.preferences.dismissedNoteIds = [];
    this.preferences.lastUpdated = new Date().toISOString();
    this.savePreferences();
  }

  /**
   * Resurfaces notes matching 7-day, 30-day, or 1-year time windows.
   */
  public getFlashbackNotes(
    notes: Note[],
    folders: Folder[] = [],
    limit: number = 5
  ): FlashbackItem[] {
    const now = new Date();
    const folderMap = new Map<string, Folder>(folders.map((f) => [f.id, f]));
    const index = vaultManager.getIndex();
    const dismissedSet = new Set(this.preferences.dismissedNoteIds);

    // Filter valid notes (non-trashed, non-empty, not dismissed)
    const validNotes = notes.filter((n) => {
      if (n.trashed) return false;
      if (dismissedSet.has(n.id)) return false;
      const contentLen = (n.content || '').trim().length;
      if (contentLen < 15) return false; // Exclude empty / trivial stubs
      return true;
    });

    const candidates: FlashbackItem[] = [];
    const usedNoteIds = new Set<string>();

    for (const note of validNotes) {
      const createdDate = new Date(note.createdAt);
      const updatedDate = new Date(note.updatedAt);

      // Prefer creation date, fallback to modified date if different
      const refDate = createdDate;
      const diffMs = now.getTime() - refDate.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      let windowKey: FlashbackWindowKey | null = null;
      let windowLabel = '';

      // Window 1: ~7 days ago (6.0 to 8.5 days)
      if (diffDays >= 6.0 && diffDays <= 8.5) {
        windowKey = '7days';
        windowLabel = '7 days ago';
      }
      // Window 2: ~30 days ago (27.0 to 33.0 days)
      else if (diffDays >= 27.0 && diffDays <= 33.0) {
        windowKey = '30days';
        windowLabel = '1 month ago';
      }
      // Window 3: ~1 year ago (355.0 to 375.0 days, handles leap years / Feb 29)
      else if (diffDays >= 355.0 && diffDays <= 375.0) {
        windowKey = '1year';
        windowLabel = '1 year ago';
      }

      if (windowKey && !usedNoteIds.has(note.id)) {
        usedNoteIds.add(note.id);

        const folder = note.folderId ? folderMap.get(note.folderId) : undefined;
        const bCount = (index.backlinks[note.id] || []).length;
        const excerpt = this.createExcerpt(note.content || '');

        candidates.push({
          note,
          windowKey,
          windowLabel,
          matchedDate: refDate,
          dateFormatted: refDate.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: windowKey === '1year' ? 'numeric' : undefined,
          }),
          excerpt,
          folderName: folder?.name,
          tags: note.tags || [],
          backlinkCount: bCount,
        });
      }
    }

    // Rank candidates deterministically:
    // 1. Backlink count weight
    // 2. Meaningful content length
    // 3. Diversify across folders
    candidates.sort((a, b) => {
      const scoreA = (a.backlinkCount * 2) + Math.min(10, a.excerpt.length / 50);
      const scoreB = (b.backlinkCount * 2) + Math.min(10, b.excerpt.length / 50);
      return scoreB - scoreA;
    });

    return candidates.slice(0, limit);
  }

  private createExcerpt(content: string): string {
    const lines = content.split('\n');
    let text = '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('---') || trimmed.startsWith('```')) {
        continue;
      }
      text = trimmed;
      break;
    }

    if (!text) text = content.slice(0, 100);

    return text
      .replace(/\[\[(.*?)\]\]/g, '$1')
      .replace(/[*_~`#$]/g, '')
      .slice(0, 120)
      .trim();
  }
}

export const flashbackService = new FlashbackService();
