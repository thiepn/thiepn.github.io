import { describe, expect, it } from 'vitest';
import ledger from '../../src/data/catalogue-ledger.json';
import curation from '../../src/data/curation.json';

describe('current catalogue contracts', () => {
  it('preserves immutable project-code mappings while allowing catalogue growth', () => {
    expect(ledger.projects['T-001']).toBe('pdf-studio');
    expect(ledger.projects['R-001']).toBe('markdown-guide');
    expect(ledger.projects['G-010']).toBe('impossible-transit');
    expect(ledger.projects['G-011']).toBe('voidcut');
    expect(ledger.projects['T-004']).toBe('mathlab');
    expect(ledger.projects['T-005']).toBe('thiepn-library');
    expect(ledger.projects['L-008']).toBe('pflegelern');
    expect(ledger.projects['L-901']).toBe('biblical-greek');
    expect(ledger.projects['V-001']).toBe('unreached');
  });

  it('defines the five current public collections', () => {
    expect(Object.keys(ledger.collections)).toHaveLength(5);
    expect(ledger.collections['C-001']).toBe('french-learning');
    expect(ledger.collections['C-003']).toBe('browser-games');
    expect(ledger.collections['C-004']).toBe('bible-faith');
    expect(ledger.collections['C-005']).toBe('productivity-creation');
    expect(ledger.collections['C-006']).toBe('typing-games');
  });

  it('locks the intentional five-project featured set', () => {
    expect(curation.featured).toEqual([
      'the-bible-challenge',
      'pdf-studio',
      'wordstrike',
      'manuscript',
      'voidcut',
    ]);
  });
});
