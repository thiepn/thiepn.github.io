import { describe, expect, it } from 'vitest';
import { chooseCollectionMapSlugs, createCollectionMapEdges, createCollectionMapPoints } from '../../src/lib/collection-map';

describe('collection map', () => {
  it('shows every project for small collections', () => {
    expect(chooseCollectionMapSlugs(['a','b','c'], ['a','b'])).toEqual(['a','b','c']);
  });
  it('uses anchors for collections larger than eight projects', () => {
    const projects = Array.from({ length: 9 }, (_, index) => `p${index + 1}`);
    expect(chooseCollectionMapSlugs(projects, ['p1','p3','p5','p7'])).toEqual(['p1','p3','p5','p7']);
  });
  it('keeps points inside the map and filters invisible relationships', () => {
    const points = createCollectionMapPoints(['a','b','c']);
    expect(points.every(({x,y}) => x >= 0 && x <= 100 && y >= 0 && y <= 100)).toBe(true);
    const edges = createCollectionMapEdges(points, [
      { from:'a',to:'b',label:'visible' },
      { from:'a',to:'z',label:'hidden' },
    ]);
    expect(edges).toHaveLength(1);
    expect(edges[0]?.label).toBe('visible');
  });
});
