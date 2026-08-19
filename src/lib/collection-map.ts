export interface CollectionMapRelationship {
  from: string;
  to: string;
  label: string;
}

export interface CollectionMapPoint {
  slug: string;
  x: number;
  y: number;
}

export interface CollectionMapEdge extends CollectionMapRelationship {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  midX: number;
  midY: number;
}

const LAYOUTS: Record<number, readonly [number, number][]> = {
  2: [[25, 50], [75, 50]],
  3: [[19, 26], [78, 34], [47, 76]],
  4: [[17, 24], [77, 22], [75, 75], [22, 73]],
  5: [[16, 23], [55, 17], [82, 43], [63, 78], [20, 72]],
  6: [[14, 22], [50, 15], [82, 28], [82, 70], [49, 82], [16, 68]],
  7: [[13, 21], [44, 13], [78, 22], [87, 54], [67, 81], [32, 82], [12, 59]],
  8: [[13, 20], [42, 12], [74, 18], [88, 44], [78, 76], [48, 85], [18, 75], [10, 46]],
};

export function chooseCollectionMapSlugs(
  projectSlugs: readonly string[],
  anchorSlugs: readonly string[],
  largeCollectionThreshold = 8,
): string[] {
  if (projectSlugs.length <= largeCollectionThreshold) return [...projectSlugs];
  const anchors = anchorSlugs.filter((slug) => projectSlugs.includes(slug));
  if (anchors.length >= 2) return anchors.slice(0, 8);
  return projectSlugs.slice(0, 6);
}

export function createCollectionMapPoints(slugs: readonly string[]): CollectionMapPoint[] {
  const count = Math.max(2, Math.min(8, slugs.length));
  const positions = LAYOUTS[count] ?? LAYOUTS[8] ?? [[50, 50] as const];
  return slugs.map((slug, index) => {
    const [x, y] = positions[index % positions.length] ?? positions[0] ?? [50, 50];
    return { slug, x, y };
  });
}

export function createCollectionMapEdges(
  points: readonly CollectionMapPoint[],
  relationships: readonly CollectionMapRelationship[],
): CollectionMapEdge[] {
  const pointBySlug = new Map(points.map((point) => [point.slug, point]));
  return relationships.flatMap((relationship) => {
    const from = pointBySlug.get(relationship.from);
    const to = pointBySlug.get(relationship.to);
    if (!from || !to) return [];
    return [{
      ...relationship,
      x1: from.x,
      y1: from.y,
      x2: to.x,
      y2: to.y,
      midX: (from.x + to.x) / 2,
      midY: (from.y + to.y) / 2,
    }];
  });
}
