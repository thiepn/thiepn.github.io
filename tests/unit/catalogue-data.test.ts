import { describe, expect, it } from 'vitest';
import ledger from '../../src/data/catalogue-ledger.json';
import curation from '../../src/data/curation.json';

describe('initial catalogue contracts', () => {
  it('reserves twenty immutable project codes', () => {
    expect(Object.keys(ledger.projects)).toHaveLength(20);
    expect(ledger.projects['T-001']).toBe('pdf-studio');
    expect(ledger.projects['R-001']).toBe('markdown-guide');
  });

  it('defines the six launch collections', () => {
    expect(Object.keys(ledger.collections)).toHaveLength(6);
  });

  it('locks the seven-project featured set', () => {
    expect(curation.featured).toEqual([
      'pdf-studio',
      'manuscript',
      'clean30',
      'wordstrike',
      'french-3000',
      'ligo-quizabend',
      'analysis-ii-klausurlabor',
    ]);
  });
});
