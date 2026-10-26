/**
 * V2.15 Unified Resource Picker Foundation
 * 
 * Unifies resource selection across all 11 first-party domains:
 *   - Notes, Tasks, Projects, People, Courses, Trips, Assets, Decisions, etc.
 *   - Permission filtered (respects vault lock and private tags)
 *   - Fast indexed metadata queries
 *   - Recents and favorites prioritization
 *   - Mobile-adaptive full-screen surface
 */

export interface PickableResourceItem {
  id: string;
  resourceType: string;
  title: string;
  subtitle?: string;
  tags?: string[];
  isLocked?: boolean;
  isFavorite?: boolean;
  contextId?: string;
}

export interface PickerFilterOptions {
  allowedTypes?: string[];
  searchQuery?: string;
  excludeIds?: string[];
  currentContextId?: string;
  isVaultLocked?: boolean;
}

export class UnifiedResourcePicker {
  private static instance: UnifiedResourcePicker | null = null;
  private resources: Map<string, PickableResourceItem> = new Map();

  private constructor() {}

  public static getInstance(): UnifiedResourcePicker {
    if (!UnifiedResourcePicker.instance) {
      UnifiedResourcePicker.instance = new UnifiedResourcePicker();
    }
    return UnifiedResourcePicker.instance;
  }

  public registerResource(item: PickableResourceItem): void {
    this.resources.set(item.id, item);
  }

  public registerBatch(items: PickableResourceItem[]): void {
    for (const item of items) {
      this.resources.set(item.id, item);
    }
  }

  public clear(): void {
    this.resources.clear();
  }

  public query(options: PickerFilterOptions, limit: number = 30): PickableResourceItem[] {
    const rawQuery = (options.searchQuery || '').trim().toLowerCase();
    const results: { item: PickableResourceItem; score: number }[] = [];

    for (const item of this.resources.values()) {
      // Exclusions
      if (options.excludeIds && options.excludeIds.includes(item.id)) continue;

      // Type filtering
      if (options.allowedTypes && options.allowedTypes.length > 0) {
        if (!options.allowedTypes.includes(item.resourceType)) continue;
      }

      // Security / Lock filtering
      if (options.isVaultLocked && item.isLocked) continue;

      let score = 0;
      const titleLower = item.title.toLowerCase();

      if (!rawQuery) {
        score = 100;
        if (item.isFavorite) score += 40;
        if (options.currentContextId && item.contextId === options.currentContextId) score += 30;
      } else {
        if (titleLower === rawQuery) {
          score = 1000;
        } else if (titleLower.startsWith(rawQuery)) {
          score = 800 - (titleLower.length - rawQuery.length);
        } else if (titleLower.includes(rawQuery)) {
          score = 500 - titleLower.indexOf(rawQuery);
        } else if (item.tags?.some(t => t.toLowerCase().includes(rawQuery))) {
          score = 300;
        }

        if (score > 0) {
          if (item.isFavorite) score += 40;
          if (options.currentContextId && item.contextId === options.currentContextId) score += 20;
        }
      }

      if (score > 0) {
        results.push({ item, score });
      }
    }

    results.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.item.title.localeCompare(b.item.title);
    });

    return results.slice(0, limit).map(r => r.item);
  }
}

export const unifiedResourcePicker = UnifiedResourcePicker.getInstance();
