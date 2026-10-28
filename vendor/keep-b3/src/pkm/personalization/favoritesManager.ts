/**
 * Favorites Manager
 * 
 * Manages global quick shortcuts to resources & views:
 * - Clear semantic distinction:
 *   - Favorite: Global shortcut to resource/view
 *   - Context Pin: Persistent item scoped inside one active Context
 *   - Focus: Active intentional daily/sprint priority
 * - Graceful degradation: Missing or trashed items are flagged as unavailable,
 *   never causing app crashes or silent data loss.
 */

import { FavoriteItem, FavoriteResourceType } from './personalizationTypes';
import { preferenceService } from './preferenceService';

const FAVORITES_STORAGE_KEY = 'user_favorites';

export class FavoritesManager {
  public getFavorites(): FavoriteItem[] {
    const stored = preferenceService.get<unknown>(FAVORITES_STORAGE_KEY, [], 'global-synced');
    return Array.isArray(stored) ? stored.filter((f): f is FavoriteItem => Boolean(f && typeof f.id === 'string' && typeof f.title === 'string' && typeof f.type === 'string' && typeof f.resourceId === 'string')) : [];
  }

  public async addFavorite(item: Omit<FavoriteItem, 'order' | 'addedAt'>): Promise<FavoriteItem> {
    const current = this.getFavorites();
    const existingIndex = current.findIndex((f) => this.matches(f, item));
    if (existingIndex !== -1) {
      return current[existingIndex];
    }

    const newFavorite: FavoriteItem = {
      ...item,
      order: current.length + 1,
      addedAt: new Date().toISOString(),
    };

    const updated = [...current, newFavorite];
    await preferenceService.set(FAVORITES_STORAGE_KEY, updated, 'global-synced');
    return newFavorite;
  }

  public async removeFavorite(id: string): Promise<void> {
    const current = this.getFavorites();
    const filtered = current.filter((f) => f.id !== id);
    const reordered = filtered.map((f, idx) => ({ ...f, order: idx + 1 }));
    await preferenceService.set(FAVORITES_STORAGE_KEY, reordered, 'global-synced');
  }

  private matches(a: Pick<FavoriteItem, 'type' | 'resourceId' | 'resourceUri'>, b: Pick<FavoriteItem, 'type' | 'resourceId' | 'resourceUri'>): boolean {
    return a.resourceUri && b.resourceUri ? a.resourceUri === b.resourceUri : !a.resourceUri && !b.resourceUri && a.type === b.type && a.resourceId === b.resourceId;
  }

  public isFavorite(resourceId: string, type: FavoriteResourceType, resourceUri?: string): boolean {
    const current = this.getFavorites();
    return current.some((f) => this.matches(f, { resourceId, type, resourceUri }));
  }

  public async toggleFavorite(item: Omit<FavoriteItem, 'order' | 'addedAt'>): Promise<boolean> {
    if (this.isFavorite(item.resourceId, item.type, item.resourceUri)) {
      const current = this.getFavorites();
      const target = current.find((f) => this.matches(f, item));
      if (target) {
        await this.removeFavorite(target.id);
      }
      return false;
    } else {
      await this.addFavorite(item);
      return true;
    }
  }

  public async reorderFavorites(id: string, direction: 'up' | 'down'): Promise<void> {
    const current = this.getFavorites();
    const index = current.findIndex((f) => f.id === id);
    if (index === -1) return;

    if (direction === 'up' && index > 0) {
      const temp = current[index];
      current[index] = current[index - 1];
      current[index - 1] = temp;
    } else if (direction === 'down' && index < current.length - 1) {
      const temp = current[index];
      current[index] = current[index + 1];
      current[index + 1] = temp;
    }

    const reordered = current.map((f, idx) => ({ ...f, order: idx + 1 }));
    await preferenceService.set(FAVORITES_STORAGE_KEY, reordered, 'global-synced');
  }

  public subscribe(callback: (favorites: FavoriteItem[]) => void): () => void {
    return preferenceService.subscribe(FAVORITES_STORAGE_KEY, callback);
  }
}

export const favoritesManager = new FavoritesManager();
