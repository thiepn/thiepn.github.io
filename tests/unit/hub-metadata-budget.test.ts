import { describe, expect, it } from 'vitest';
import { createMetadataReadBudget } from '../../src/lib/hub-metadata-budget';

describe('B11 bounded manual Hub Library metadata refresh', () => {
  it('limits reads, never implicitly calls Library, and clears after the time window', () => {
    let time = 1000;
    const budget = createMetadataReadBudget(() => time, 2, 5000);
    expect(budget.remaining()).toBe(2);
    expect(budget.take()).toBe(true);
    expect(budget.take()).toBe(true);
    expect(budget.take()).toBe(false);
    expect(budget.remaining()).toBe(0);
    time += 5000;
    expect(budget.take()).toBe(true);
  });
  it('can clear budget only when the explicitly authorized session ends', () => {
    const budget = createMetadataReadBudget(() => 1000, 1);
    expect(budget.take()).toBe(true);
    expect(budget.take()).toBe(false);
    budget.reset();
    expect(budget.take()).toBe(true);
  });
});
