import { Note, Folder } from '../../types';
import { NavigableResourceType, QuickSwitcherItem } from './navigationTypes';
import { preferenceService } from '../personalization/preferenceService';
import { ContextDescriptor } from '../context/contextTypes';

const RECENT_ITEMS_STORAGE_KEY = 'keepnotes_quick_switcher_recents_v1_7';
const MAX_RECENT_ITEMS = 25;

export interface QuickSwitcherIndexContext {
  notes: Note[];
  folders?: Folder[];
  activeContext?: ContextDescriptor | null;
  customResources?: QuickSwitcherItem[];
  isLocked?: boolean;
}

export class QuickSwitcherService {
  private recentItems: Array<{ id: string; resourceType: NavigableResourceType; timestamp: number }> = [];

  constructor() {
    this.loadRecents();
  }

  private loadRecents(): void {
    try {
      const raw = localStorage.getItem(RECENT_ITEMS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.recentItems = parsed.slice(0, MAX_RECENT_ITEMS);
        }
      }
    } catch {
      this.recentItems = [];
    }
  }

  public saveRecent(id: string, resourceType: NavigableResourceType): void {
    this.recentItems = [
      { id, resourceType, timestamp: Date.now() },
      ...this.recentItems.filter((item) => item.id !== id),
    ].slice(0, MAX_RECENT_ITEMS);

    try {
      localStorage.setItem(RECENT_ITEMS_STORAGE_KEY, JSON.stringify(this.recentItems));
    } catch {
      // Safe client-side fallback
    }
  }

  public clearRecents(): void {
    this.recentItems = [];
    try {
      localStorage.removeItem(RECENT_ITEMS_STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  public getRecentIds(): string[] {
    return this.recentItems.map((r) => r.id);
  }

  /**
   * Build the complete lightweight metadata index for the Quick Switcher
   */
  public buildIndex(context: QuickSwitcherIndexContext): QuickSwitcherItem[] {
    if (context.isLocked) {
      // Privacy policy: Locked vault exposes zero protected notes or sensitive titles
      return [];
    }

    const items: QuickSwitcherItem[] = [];
    const favorites = preferenceService.getFavorites();
    const favoriteNoteIds = new Set(
      favorites.filter((f) => f.resourceType === 'note').map((f) => f.resourceId)
    );
    const recentMap = new Map<string, number>();
    this.recentItems.forEach((r, idx) => {
      recentMap.set(r.id, Date.now() - idx * 1000);
    });

    const folderMap = new Map<string, string>();
    if (context.folders) {
      context.folders.forEach((f) => folderMap.set(f.id, f.name));
    }

    // 1. Index All Notes (Titles + Aliases + Metadata ONLY - no full text bodies)
    for (const note of context.notes) {
      if (note.trashed) continue;

      const title = (note.title || 'Untitled Note').trim();
      const folderName = note.folderId ? folderMap.get(note.folderId) : undefined;
      const isFav = note.pinned || favoriteNoteIds.has(note.id);
      const isRecent = recentMap.has(note.id);
      const lastAccessed = recentMap.get(note.id) || note.updatedAt;

      // Extract aliases from note tags or metadata if present
      const aliases: string[] = [];
      if (Array.isArray(note.tags)) {
        note.tags.forEach((t) => {
          if (t.startsWith('alias:')) {
            aliases.push(t.replace('alias:', '').trim());
          }
        });
      }

      // Check active context relevance
      let contextTag: string | undefined;
      if (context.activeContext) {
        const matchesContext =
          (note.tags && note.tags.some((t) => t.toLowerCase() === context.activeContext?.title.toLowerCase())) ||
          (note.folderId && note.folderId === context.activeContext.id);
        if (matchesContext) {
          contextTag = context.activeContext.title;
        }
      }

      const numericLastAccessed =
        typeof lastAccessed === 'string'
          ? new Date(lastAccessed).getTime()
          : typeof lastAccessed === 'number'
          ? lastAccessed
          : Date.now();

      items.push({
        id: note.id,
        resourceType: 'note',
        title,
        canonicalTitle: title.toLowerCase(),
        aliases,
        tags: note.tags || [],
        subtitle: folderName ? `Folder: ${folderName}` : undefined,
        iconName: note.type === 'checklist' ? 'CheckSquare' : 'FileText',
        isFavorite: isFav,
        isRecent,
        lastAccessedAt: numericLastAccessed,
        contextTag,
        folderPath: folderName,
      });
    }

    // 2. Index Custom / Structured Resources (Projects, People, Courses, Saved Views, etc.)
    if (context.customResources && context.customResources.length > 0) {
      for (const res of context.customResources) {
        items.push({
          ...res,
          canonicalTitle: res.title.toLowerCase(),
          isFavorite: res.isFavorite || false,
          isRecent: recentMap.has(res.id),
          lastAccessedAt: recentMap.get(res.id) || Date.now(),
        });
      }
    }

    return items;
  }

  /**
   * High-speed deterministic ranking algorithm
   * Rules:
   * 1. Exact title match (Score 1000+) - GUARANTEED to outrank recency or favorites
   * 2. Exact alias match (Score 900+)
   * 3. Title prefix match (Score 800+)
   * 4. Strong fuzzy/word-boundary match (Score 600+)
   * 5. Favorite boost (+150)
   * 6. Active Context relevance (+100)
   * 7. Recent bonus (+50)
   * 8. General substring (+10 to +300)
   */
  public search(
    items: QuickSwitcherItem[],
    rawQuery: string,
    options?: {
      activeContextId?: string;
      filterType?: NavigableResourceType;
      maxResults?: number;
    }
  ): QuickSwitcherItem[] {
    const query = rawQuery.trim().toLowerCase();
    const maxResults = options?.maxResults || 40;

    // Filter by resource type if specified
    let candidateItems = items;
    if (options?.filterType) {
      candidateItems = items.filter((i) => i.resourceType === options.filterType);
    }

    // Empty Query: Return Recent & Favorites (Restrained, no behavioral noise)
    if (!query) {
      return candidateItems
        .slice()
        .sort((a, b) => {
          // Favorites first, then recents by timestamp
          if (a.isFavorite && !b.isFavorite) return -1;
          if (!a.isFavorite && b.isFavorite) return 1;
          const aTime = a.lastAccessedAt || 0;
          const bTime = b.lastAccessedAt || 0;
          return bTime - aTime;
        })
        .slice(0, maxResults);
    }

    const scored: Array<{ item: QuickSwitcherItem; score: number; matchType: QuickSwitcherItem['matchType'] }> = [];

    for (const item of candidateItems) {
      const titleLower = item.canonicalTitle;
      const aliasesLower = (item.aliases || []).map((a) => a.toLowerCase());

      let baseScore = 0;
      let matchType: QuickSwitcherItem['matchType'] = 'general';

      // 1. Exact title match
      if (titleLower === query) {
        baseScore = 2000;
        matchType = 'exact-title';
      }
      // 2. Exact alias match
      else if (aliasesLower.includes(query)) {
        baseScore = 1800;
        matchType = 'exact-alias';
      }
      // 3. Title starts with query
      else if (titleLower.startsWith(query)) {
        baseScore = 1400 - Math.min(titleLower.length - query.length, 200);
        matchType = 'prefix-title';
      }
      // 4. Word boundary start (e.g. "Analysis" in "Real Analysis II")
      else if (titleLower.includes(` ${query}`) || titleLower.includes(`-${query}`) || titleLower.includes(`_${query}`)) {
        baseScore = 1100;
        matchType = 'fuzzy-title';
      }
      // 5. Title substring match
      else if (titleLower.includes(query)) {
        const index = titleLower.indexOf(query);
        baseScore = 800 - index * 10;
        matchType = 'general';
      }
      // 6. Alias substring match
      else if (aliasesLower.some((a) => a.includes(query))) {
        baseScore = 700;
        matchType = 'general';
      }
      // 7. Tag match
      else if (item.tags && item.tags.some((t) => t.toLowerCase().includes(query))) {
        baseScore = 650;
        matchType = 'general';
      }
      // 8. Acronym match (e.g. "pkm" matches "Personal Knowledge Management")
      else {
        const acronym = titleLower
          .split(/[\s\-_]+/)
          .map((w) => w[0])
          .join('');
        if (acronym.startsWith(query)) {
          baseScore = 600;
          matchType = 'fuzzy-title';
        } else if (this.isFuzzyMatch(titleLower, query)) {
          baseScore = 300;
          matchType = 'general';
        }
      }

      if (baseScore > 0) {
        let totalScore = baseScore;

        // Context Boost
        if (item.contextTag) {
          totalScore += 100;
        }

        // Favorite Boost
        if (item.isFavorite) {
          totalScore += 75;
        }

        // Recent bonus
        if (item.isRecent) {
          totalScore += 40;
        }

        scored.push({
          item: {
            ...item,
            score: totalScore,
            matchType,
          },
          score: totalScore,
          matchType,
        });
      }
    }

    // Sort descending by score
    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, maxResults).map((s) => s.item);
  }

  private isFuzzyMatch(text: string, query: string): boolean {
    let tIdx = 0;
    let qIdx = 0;
    while (tIdx < text.length && qIdx < query.length) {
      if (text[tIdx] === query[qIdx]) {
        qIdx++;
      }
      tIdx++;
    }
    return qIdx === query.length;
  }
}

export const quickSwitcherService = new QuickSwitcherService();
