/**
 * PKM V2.7 — Viewport LOD, Spatial Culling & Resource Disposal Engine
 *
 * Provides:
 * - 3-Tier Level of Detail (LOD) for Canvas & Graph: Detailed, Summary, Minimal Clustered
 * - Offscreen spatial culling to avoid rendering off-camera nodes/cards
 * - Clustered node/edge aggregation for extreme graphs (caps rendered DOM elements)
 * - Safe disposal hooks for WebGL, Canvas, PDF Workers, and Object URLs
 */

export type LODLevel = 'detailed' | 'summary' | 'minimal';

export interface ViewportRect {
  x: number;
  y: number;
  width: number;
  height: number;
  zoom: number;
}

export interface SpatialItem {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: string;
  data?: any;
}

export interface CulledViewportResult<T extends SpatialItem = SpatialItem> {
  visibleItems: T[];
  lod: LODLevel;
  totalItems: number;
  culledCount: number;
  isAggregated: boolean;
}

export class ViewportLODEngineV2 {
  private static instance: ViewportLODEngineV2;
  private registeredObjectURLs = new Set<string>();
  private activeCleanupFns = new Set<() => void>();

  private constructor() {}

  public static getInstance(): ViewportLODEngineV2 {
    if (!ViewportLODEngineV2.instance) {
      ViewportLODEngineV2.instance = new ViewportLODEngineV2();
    }
    return ViewportLODEngineV2.instance;
  }

  /**
   * Determine Level of Detail from zoom scale
   */
  public getLOD(zoom: number): LODLevel {
    if (zoom >= 0.75) return 'detailed';
    if (zoom >= 0.3) return 'summary';
    return 'minimal';
  }

  /**
   * Performs spatial culling against current viewport with configurable max node caps
   */
  public cullItems<T extends SpatialItem>(
    items: T[],
    viewport: ViewportRect,
    maxRenderCap = 1000
  ): CulledViewportResult<T> {
    const lod = this.getLOD(viewport.zoom);

    // Expand viewport slightly as buffer (10% overscan)
    const bufferX = viewport.width * 0.1;
    const bufferY = viewport.height * 0.1;
    const minX = viewport.x - bufferX;
    const maxX = viewport.x + viewport.width + bufferX;
    const minY = viewport.y - bufferY;
    const maxY = viewport.y + viewport.height + bufferY;

    const visibleItems: T[] = [];
    let culledCount = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemRight = item.x + item.width;
      const itemBottom = item.y + item.height;

      const isInside =
        itemRight >= minX &&
        item.x <= maxX &&
        itemBottom >= minY &&
        item.y <= maxY;

      if (isInside) {
        if (visibleItems.length < maxRenderCap) {
          visibleItems.push(item);
        } else {
          culledCount++;
        }
      } else {
        culledCount++;
      }
    }

    return {
      visibleItems,
      lod,
      totalItems: items.length,
      culledCount,
      isAggregated: items.length > maxRenderCap && visibleItems.length >= maxRenderCap,
    };
  }

  /**
   * Register Blob/Object URL for automatic lifecycle tracking & disposal
   */
  public registerObjectURL(url: string): string {
    this.registeredObjectURLs.add(url);
    return url;
  }

  public revokeObjectURL(url: string): void {
    if (this.registeredObjectURLs.has(url)) {
      if (typeof URL !== 'undefined' && URL.revokeObjectURL) {
        try {
          URL.revokeObjectURL(url);
        } catch {}
      }
      this.registeredObjectURLs.delete(url);
    }
  }

  public registerCleanupHook(fn: () => void): () => void {
    this.activeCleanupFns.add(fn);
    return () => this.activeCleanupFns.delete(fn);
  }

  /**
   * Explicitly teardown all active rendering contexts, canvases, and object URLs
   */
  public disposeAll(): void {
    for (const url of this.registeredObjectURLs) {
      if (typeof URL !== 'undefined' && URL.revokeObjectURL) {
        try {
          URL.revokeObjectURL(url);
        } catch {}
      }
    }
    this.registeredObjectURLs.clear();

    for (const fn of this.activeCleanupFns) {
      try {
        fn();
      } catch {}
    }
    this.activeCleanupFns.clear();
  }

  public getTrackedResourceCount(): { objectUrls: number; cleanupHooks: number } {
    return {
      objectUrls: this.registeredObjectURLs.size,
      cleanupHooks: this.activeCleanupFns.size,
    };
  }
}

export const viewportLODEngineV2 = ViewportLODEngineV2.getInstance();
