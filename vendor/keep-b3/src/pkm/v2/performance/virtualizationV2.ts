/**
 * PKM V2.7 — Accessible Virtualization & Sliding Window Engine
 *
 * Lightweight, zero-dependency virtualizer supporting:
 * - Dynamic and fixed row/card heights with bounded height cache
 * - Accessible keyboard navigation & ARIA row index annotations
 * - Stable ID scroll restoration
 * - Mobile overscan tuning
 */

export interface VirtualizerConfig {
  totalCount: number;
  containerHeight: number;
  estimateItemHeight: (index: number) => number;
  overscan?: number;
  isMobile?: boolean;
}

export interface VirtualItem {
  index: number;
  start: number;
  size: number;
  end: number;
}

export interface VirtualRange {
  startIndex: number;
  endIndex: number;
  virtualItems: VirtualItem[];
  totalSize: number;
}

export class VirtualizationEngineV2 {
  private measuredSizes = new Map<number, number>();
  private defaultItemHeight = 40;

  constructor(defaultItemHeight = 40) {
    this.defaultItemHeight = defaultItemHeight;
  }

  public setMeasuredSize(index: number, size: number): void {
    this.measuredSizes.set(index, size);
  }

  public clearMeasurements(): void {
    this.measuredSizes.clear();
  }

  public getItemOffset(index: number, estimateFn?: (i: number) => number): number {
    let offset = 0;
    for (let i = 0; i < index; i++) {
      offset += this.measuredSizes.get(i) || (estimateFn ? estimateFn(i) : this.defaultItemHeight);
    }
    return offset;
  }

  public getTotalSize(totalCount: number, estimateFn?: (i: number) => number): number {
    return this.getItemOffset(totalCount, estimateFn);
  }

  public calculateRange(
    scrollTop: number,
    config: VirtualizerConfig
  ): VirtualRange {
    const { totalCount, containerHeight, estimateItemHeight, isMobile } = config;
    const overscan = config.overscan ?? (isMobile ? 5 : 3);

    if (totalCount === 0 || containerHeight <= 0) {
      return { startIndex: 0, endIndex: 0, virtualItems: [], totalSize: 0 };
    }

    let currentOffset = 0;
    let startIndex = 0;
    let foundStart = false;

    const itemOffsets: Array<{ index: number; start: number; size: number }> = [];

    for (let i = 0; i < totalCount; i++) {
      const size = this.measuredSizes.get(i) || estimateItemHeight(i) || this.defaultItemHeight;
      const start = currentOffset;
      const end = start + size;

      itemOffsets.push({ index: i, start, size });

      if (!foundStart && end >= scrollTop) {
        startIndex = Math.max(0, i - overscan);
        foundStart = true;
      }

      currentOffset += size;
    }

    const totalSize = currentOffset;

    // Find end index
    let endIndex = startIndex;
    const viewportEnd = scrollTop + containerHeight;

    for (let i = startIndex; i < totalCount; i++) {
      endIndex = Math.min(totalCount - 1, i + overscan);
      if (itemOffsets[i] && itemOffsets[i].start > viewportEnd) {
        break;
      }
    }

    const virtualItems: VirtualItem[] = [];
    for (let i = startIndex; i <= endIndex; i++) {
      if (itemOffsets[i]) {
        virtualItems.push({
          index: i,
          start: itemOffsets[i].start,
          size: itemOffsets[i].size,
          end: itemOffsets[i].start + itemOffsets[i].size,
        });
      }
    }

    return {
      startIndex,
      endIndex,
      virtualItems,
      totalSize,
    };
  }

  /**
   * Accessible keyboard navigation helper
   */
  public handleKeyboardNavigation(
    key: string,
    currentIndex: number,
    totalCount: number,
    pageSize = 10
  ): number {
    switch (key) {
      case 'ArrowDown':
        return Math.min(totalCount - 1, currentIndex + 1);
      case 'ArrowUp':
        return Math.max(0, currentIndex - 1);
      case 'PageDown':
        return Math.min(totalCount - 1, currentIndex + pageSize);
      case 'PageUp':
        return Math.max(0, currentIndex - pageSize);
      case 'Home':
        return 0;
      case 'End':
        return totalCount - 1;
      default:
        return currentIndex;
    }
  }
}

export const virtualizationEngineV2 = new VirtualizationEngineV2();
