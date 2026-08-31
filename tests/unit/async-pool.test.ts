import { describe, expect, it } from 'vitest';
import { forEachConcurrent, normalizeConcurrency } from '../../scripts/lib/async-pool.mjs';

describe('bounded async worker pool', () => {
  it('normalizes invalid and excessive concurrency values', () => {
    expect(normalizeConcurrency(undefined)).toBe(6);
    expect(normalizeConcurrency('0')).toBe(6);
    expect(normalizeConcurrency('3.9')).toBe(3);
    expect(normalizeConcurrency('99')).toBe(12);
  });

  it('processes every item while respecting the concurrency ceiling', async () => {
    let active = 0;
    let peak = 0;
    const seen: number[] = [];
    const items = Array.from({ length: 18 }, (_, index) => index);

    await forEachConcurrent(items, 4, async (item) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 4));
      seen.push(item);
      active -= 1;
    });

    expect(peak).toBeLessThanOrEqual(4);
    expect(seen.sort((a, b) => a - b)).toEqual(items);
  });

  it('does nothing for an empty input', async () => {
    let calls = 0;
    await forEachConcurrent([], 6, async () => { calls += 1; });
    expect(calls).toBe(0);
  });
});
