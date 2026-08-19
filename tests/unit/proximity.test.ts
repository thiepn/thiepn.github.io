import { describe, expect, it } from 'vitest';
import { calculateProximity } from '../../src/motion/proximity';

describe('Living Index proximity', () => {
  const points = [
    { id: 'a', x: 100, y: 100 },
    { id: 'b', x: 160, y: 100 },
    { id: 'c', x: 400, y: 400 },
  ];

  it('gives the closest project the strongest wake intensity', () => {
    const results = calculateProximity(points, { x: 105, y: 100 });
    expect(results[0]?.id).toBe('a');
    expect(results[0]?.intensity).toBeGreaterThan(results[1]?.intensity ?? 0);
    expect(results[1]?.intensity).toBeLessThanOrEqual(.52);
  });

  it('caps mechanical movement below two pixels', () => {
    const results = calculateProximity(points, { x: 120, y: 120 });
    for (const result of results) {
      expect(Math.hypot(result.offsetX, result.offsetY)).toBeLessThanOrEqual(1.800001);
    }
  });

  it('does not activate points beyond the radius', () => {
    const result = calculateProximity([{ id: 'far', x: 1000, y: 1000 }], { x: 0, y: 0 }, 220)[0];
    expect(result?.intensity).toBe(0);
  });
});
