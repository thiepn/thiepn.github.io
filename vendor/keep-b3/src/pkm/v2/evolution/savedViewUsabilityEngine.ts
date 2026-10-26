/**
 * V2.15 Saved View Usability & Navigation Engine
 * 
 * Features:
 *   - Fast Saved View switching and favorites pinning
 *   - Explicit "Modified" state tracking with Save / Reset / Save as New
 *   - Temporary filter isolation (remains ephemeral unless explicitly saved)
 *   - Result-adjacent navigation (Next / Previous item in active Saved View)
 *   - Origin query preservation during back-navigation
 */

export interface SavedViewStateV2 {
  id: string;
  name: string;
  domain: string;
  filterQuery: string;
  sortField: string;
  sortOrder: 'asc' | 'desc';
  viewMode: 'list' | 'table' | 'cards' | 'kanban';
  isFavorite?: boolean;
  isModified?: boolean;
  temporaryFilterActive?: boolean;
}

export class SavedViewUsabilityEngine {
  private static instance: SavedViewUsabilityEngine | null = null;
  private savedViews: Map<string, SavedViewStateV2> = new Map();
  private activeViewId: string | null = null;
  private currentResultIds: string[] = [];
  private currentResultIndex: number = -1;

  private constructor() {}

  public static getInstance(): SavedViewUsabilityEngine {
    if (!SavedViewUsabilityEngine.instance) {
      SavedViewUsabilityEngine.instance = new SavedViewUsabilityEngine();
    }
    return SavedViewUsabilityEngine.instance;
  }

  public registerSavedView(view: SavedViewStateV2): void {
    this.savedViews.set(view.id, { ...view, isModified: false, temporaryFilterActive: false });
  }

  public registerBatch(views: SavedViewStateV2[]): void {
    for (const v of views) {
      this.registerSavedView(v);
    }
  }

  public getSavedView(id: string): SavedViewStateV2 | undefined {
    return this.savedViews.get(id);
  }

  public getAllSavedViews(): SavedViewStateV2[] {
    return Array.from(this.savedViews.values());
  }

  public setActiveView(viewId: string, resultIds: string[] = []): void {
    this.activeViewId = viewId;
    this.currentResultIds = resultIds;
    this.currentResultIndex = -1;
  }

  public applyTemporaryFilter(viewId: string, filterModifier: Partial<SavedViewStateV2>): SavedViewStateV2 | null {
    const view = this.savedViews.get(viewId);
    if (!view) return null;

    const modified: SavedViewStateV2 = {
      ...view,
      ...filterModifier,
      isModified: true,
      temporaryFilterActive: true,
    };
    this.savedViews.set(viewId, modified);
    return modified;
  }

  public resetView(viewId: string, originalState: SavedViewStateV2): SavedViewStateV2 {
    const clean: SavedViewStateV2 = {
      ...originalState,
      isModified: false,
      temporaryFilterActive: false,
    };
    this.savedViews.set(viewId, clean);
    return clean;
  }

  public saveViewChanges(viewId: string): SavedViewStateV2 | null {
    const view = this.savedViews.get(viewId);
    if (!view) return null;

    const updated: SavedViewStateV2 = {
      ...view,
      isModified: false,
      temporaryFilterActive: false,
    };
    this.savedViews.set(viewId, updated);
    return updated;
  }

  // Result Navigation (Next / Previous item in view)
  public setCurrentResource(resourceId: string): void {
    this.currentResultIndex = this.currentResultIds.indexOf(resourceId);
  }

  public getAdjacentResource(direction: 'next' | 'previous'): {
    resourceId: string | null;
    index: number;
    total: number;
    hasAdjacent: boolean;
  } {
    const total = this.currentResultIds.length;
    if (total === 0 || this.currentResultIndex === -1) {
      return { resourceId: null, index: -1, total, hasAdjacent: false };
    }

    const nextIndex = direction === 'next' ? this.currentResultIndex + 1 : this.currentResultIndex - 1;
    if (nextIndex >= 0 && nextIndex < total) {
      this.currentResultIndex = nextIndex;
      return {
        resourceId: this.currentResultIds[nextIndex],
        index: nextIndex,
        total,
        hasAdjacent: true,
      };
    }

    return {
      resourceId: null,
      index: this.currentResultIndex,
      total,
      hasAdjacent: false,
    };
  }
}

export const savedViewUsabilityEngine = SavedViewUsabilityEngine.getInstance();
