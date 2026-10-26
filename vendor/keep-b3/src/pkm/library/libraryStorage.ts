/**
 * Phase P52 — Reading, Books, Articles, Media & Knowledge Library
 *
 * Local Storage & Memory Cache Manager for Library Items, Highlights, and Sessions.
 * Follows vault encryption lock safety (clearing memory cache on lock).
 */

import { LibraryItem, SourceHighlight, ReadingSession } from './libraryTypes';

const STORAGE_KEYS = {
  ITEMS: 'pkm_library_items_v1',
  HIGHLIGHTS: 'pkm_library_highlights_v1',
  SESSIONS: 'pkm_library_sessions_v1',
};

class LibraryStorage {
  private itemsCache: Map<string, LibraryItem> = new Map();
  private highlightsCache: Map<string, SourceHighlight> = new Map();
  private sessionsCache: Map<string, ReadingSession> = new Map();
  private isLoaded = false;

  constructor() {
    this.loadFromStorage();
  }

  public loadFromStorage(): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return;
      }

      const rawItems = localStorage.getItem(STORAGE_KEYS.ITEMS);
      if (rawItems) {
        const parsed = JSON.parse(rawItems) as LibraryItem[];
        this.itemsCache.clear();
        for (const item of parsed) {
          if (item && item.id) {
            this.itemsCache.set(item.id, item);
          }
        }
      }

      const rawHighlights = localStorage.getItem(STORAGE_KEYS.HIGHLIGHTS);
      if (rawHighlights) {
        const parsed = JSON.parse(rawHighlights) as SourceHighlight[];
        this.highlightsCache.clear();
        for (const hl of parsed) {
          if (hl && hl.id) {
            this.highlightsCache.set(hl.id, hl);
          }
        }
      }

      const rawSessions = localStorage.getItem(STORAGE_KEYS.SESSIONS);
      if (rawSessions) {
        const parsed = JSON.parse(rawSessions) as ReadingSession[];
        this.sessionsCache.clear();
        for (const ses of parsed) {
          if (ses && ses.id) {
            this.sessionsCache.set(ses.id, ses);
          }
        }
      }

      this.isLoaded = true;
    } catch (err) {
      console.error('[LibraryStorage] Failed to load from localStorage:', err);
    }
  }

  public saveAll(): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return;
      }

      const items = Array.from(this.itemsCache.values());
      localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(items));

      const highlights = Array.from(this.highlightsCache.values());
      localStorage.setItem(STORAGE_KEYS.HIGHLIGHTS, JSON.stringify(highlights));

      const sessions = Array.from(this.sessionsCache.values());
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
    } catch (err) {
      console.error('[LibraryStorage] Failed to persist to localStorage:', err);
    }
  }

  // --- ITEMS ---
  public getItems(): LibraryItem[] {
    if (!this.isLoaded) this.loadFromStorage();
    return Array.from(this.itemsCache.values());
  }

  public getItem(id: string): LibraryItem | undefined {
    if (!this.isLoaded) this.loadFromStorage();
    return this.itemsCache.get(id);
  }

  public saveItem(item: LibraryItem): void {
    this.itemsCache.set(item.id, { ...item, updatedAt: Date.now() });
    this.saveAll();
  }

  public deleteItem(id: string): boolean {
    const deleted = this.itemsCache.delete(id);
    if (deleted) {
      // Also delete associated native highlights for this item
      for (const [hlId, hl] of this.highlightsCache.entries()) {
        if (hl.libraryItemId === id) {
          this.highlightsCache.delete(hlId);
        }
      }
      // Also delete sessions
      for (const [sesId, ses] of this.sessionsCache.entries()) {
        if (ses.libraryItemId === id) {
          this.sessionsCache.delete(sesId);
        }
      }
      this.saveAll();
    }
    return deleted;
  }

  // --- HIGHLIGHTS ---
  public getHighlights(libraryItemId?: string): SourceHighlight[] {
    if (!this.isLoaded) this.loadFromStorage();
    const all = Array.from(this.highlightsCache.values());
    if (libraryItemId) {
      return all.filter((h) => h.libraryItemId === libraryItemId);
    }
    return all;
  }

  public getHighlight(id: string): SourceHighlight | undefined {
    if (!this.isLoaded) this.loadFromStorage();
    return this.highlightsCache.get(id);
  }

  public saveHighlight(highlight: SourceHighlight): void {
    this.highlightsCache.set(highlight.id, { ...highlight, updatedAt: Date.now() });
    this.saveAll();
  }

  public deleteHighlight(id: string): boolean {
    const deleted = this.highlightsCache.delete(id);
    if (deleted) {
      this.saveAll();
    }
    return deleted;
  }

  // --- SESSIONS ---
  public getSessions(libraryItemId?: string): ReadingSession[] {
    if (!this.isLoaded) this.loadFromStorage();
    const all = Array.from(this.sessionsCache.values());
    if (libraryItemId) {
      return all.filter((s) => s.libraryItemId === libraryItemId);
    }
    return all;
  }

  public saveSession(session: ReadingSession): void {
    this.sessionsCache.set(session.id, { ...session, updatedAt: Date.now() });
    this.saveAll();
  }

  public deleteSession(id: string): boolean {
    const deleted = this.sessionsCache.delete(id);
    if (deleted) {
      this.saveAll();
    }
    return deleted;
  }

  /**
   * Clears volatile in-memory caches when vault is locked
   */
  public handleVaultLock(): void {
    this.itemsCache.clear();
    this.highlightsCache.clear();
    this.sessionsCache.clear();
    this.isLoaded = false;
  }

  /**
   * Reset all data (e.g. for tests)
   */
  public clearAll(): void {
    this.itemsCache.clear();
    this.highlightsCache.clear();
    this.sessionsCache.clear();
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(STORAGE_KEYS.ITEMS);
      localStorage.removeItem(STORAGE_KEYS.HIGHLIGHTS);
      localStorage.removeItem(STORAGE_KEYS.SESSIONS);
    }
  }
}

export const libraryStorage = new LibraryStorage();
