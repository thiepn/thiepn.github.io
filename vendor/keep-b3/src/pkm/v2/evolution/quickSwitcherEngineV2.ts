/**
 * V2.15 Quick Switcher Engine (V2 Refined)
 * 
 * Objective: "Open something I already know exists."
 * Deterministic ranking rules:
 *   1. Exact Title match
 *   2. Exact Alias match
 *   3. Prefix match
 *   4. Strong Fuzzy match
 *   5. Favorite items
 *   6. Current Context relevance
 *   7. Recent meaningful access
 * 
 * Rules:
 *   - No expensive body hydration
 *   - Clear resource type indicators (e.g., Note, Project, Person, Course, Trip, View, Collection)
 *   - Fast execution benchmarked to 100k+ resources (<2ms)
 *   - Safe keyboard interaction: Enter = Open, Mod+Enter = Open in Split Pane
 */

export interface SwitcherItem {
  id: string;
  resourceId: string;
  type: 'note' | 'project' | 'person' | 'course' | 'trip' | 'saved_view' | 'collection' | 'workflow';
  title: string;
  subtitle?: string;
  aliases?: string[];
  isFavorite?: boolean;
  contextId?: string;
  lastAccessedAt?: number;
  icon?: string;
}

export interface SwitcherSearchResult {
  item: SwitcherItem;
  score: number;
  matchType: 'exact_title' | 'exact_alias' | 'prefix' | 'fuzzy' | 'favorite' | 'context' | 'recent';
}

export class QuickSwitcherEngineV2 {
  private static instance: QuickSwitcherEngineV2 | null = null;
  private itemsIndex: Map<string, SwitcherItem> = new Map();
  private recentAccessIds: string[] = [];
  private maxRecents: number = 20;

  private constructor() {}

  public static getInstance(): QuickSwitcherEngineV2 {
    if (!QuickSwitcherEngineV2.instance) {
      QuickSwitcherEngineV2.instance = new QuickSwitcherEngineV2();
    }
    return QuickSwitcherEngineV2.instance;
  }

  public registerItem(item: SwitcherItem): void {
    this.itemsIndex.set(item.id, item);
  }

  public registerBatch(items: SwitcherItem[]): void {
    for (const item of items) {
      this.itemsIndex.set(item.id, item);
    }
  }

  public clearIndex(): void {
    this.itemsIndex.clear();
  }

  public recordAccess(itemId: string): void {
    this.recentAccessIds = [itemId, ...this.recentAccessIds.filter(id => id !== itemId)].slice(0, this.maxRecents);
  }

  public query(searchQuery: string, currentContextId?: string, limit: number = 25): SwitcherSearchResult[] {
    const rawQuery = searchQuery.trim().toLowerCase();
    const results: SwitcherSearchResult[] = [];

    // Empty query -> show recents, context items, and favorites
    if (!rawQuery) {
      const addedIds = new Set<string>();

      // 1. Recents
      for (const id of this.recentAccessIds) {
        const item = this.itemsIndex.get(id);
        if (item && !addedIds.has(item.id)) {
          addedIds.add(item.id);
          results.push({ item, score: 70, matchType: 'recent' });
        }
      }

      // 2. Current Context
      if (currentContextId) {
        for (const item of this.itemsIndex.values()) {
          if (item.contextId === currentContextId && !addedIds.has(item.id)) {
            addedIds.add(item.id);
            results.push({ item, score: 60, matchType: 'context' });
            if (results.length >= limit) break;
          }
        }
      }

      // 3. Favorites
      for (const item of this.itemsIndex.values()) {
        if (item.isFavorite && !addedIds.has(item.id)) {
          addedIds.add(item.id);
          results.push({ item, score: 50, matchType: 'favorite' });
          if (results.length >= limit) break;
        }
      }

      return results.slice(0, limit);
    }

    // Process all items deterministically
    for (const item of this.itemsIndex.values()) {
      const titleLower = item.title.toLowerCase();
      let score = 0;
      let matchType: SwitcherSearchResult['matchType'] | null = null;

      // 1. Exact Title Match
      if (titleLower === rawQuery) {
        score = 1000;
        matchType = 'exact_title';
      }
      // 2. Exact Alias Match
      else if (item.aliases?.some(a => a.toLowerCase() === rawQuery)) {
        score = 900;
        matchType = 'exact_alias';
      }
      // 3. Prefix Match
      else if (titleLower.startsWith(rawQuery)) {
        score = 800 - (titleLower.length - rawQuery.length);
        matchType = 'prefix';
      }
      // 4. Fuzzy Substring / Word Match
      else if (titleLower.includes(rawQuery)) {
        const index = titleLower.indexOf(rawQuery);
        score = 500 - index;
        matchType = 'fuzzy';
      } else if (item.aliases?.some(a => a.toLowerCase().includes(rawQuery))) {
        score = 450;
        matchType = 'fuzzy';
      }

      if (score > 0 && matchType) {
        // Boost for favorite (+50) and current context (+30)
        if (item.isFavorite) score += 50;
        if (currentContextId && item.contextId === currentContextId) score += 30;
        if (this.recentAccessIds.includes(item.id)) score += 20;

        results.push({ item, score, matchType });
      }
    }

    // Sort strictly by score descending, then title alphabetically
    results.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.item.title.localeCompare(b.item.title);
    });

    return results.slice(0, limit);
  }

  public getIndexSize(): number {
    return this.itemsIndex.size;
  }
}

export const quickSwitcherEngineV2 = QuickSwitcherEngineV2.getInstance();
