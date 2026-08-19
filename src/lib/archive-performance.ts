export type ArchivePositions = Map<string, DOMRect>;
export const ARCHIVE_REFLOW_ITEM_LIMIT = 60;

export function shouldAnimateArchiveReflow(visibleCount: number): boolean {
  return visibleCount > 0 && visibleCount <= ARCHIVE_REFLOW_ITEM_LIMIT;
}

export function captureArchivePositions(container: HTMLElement): ArchivePositions {
  const positions: ArchivePositions = new Map();
  const viewportTop = -window.innerHeight * .35;
  const viewportBottom = window.innerHeight * 1.35;
  container.querySelectorAll<HTMLElement>('[data-archive-item]:not([hidden])').forEach((item) => {
    const slug = item.dataset.slug;
    if (!slug) return;
    const rect = item.getBoundingClientRect();
    if (rect.bottom < viewportTop || rect.top > viewportBottom) return;
    positions.set(slug, rect);
  });
  return positions;
}
