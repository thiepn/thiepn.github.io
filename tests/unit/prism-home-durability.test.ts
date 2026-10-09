import { describe, expect, it } from 'vitest';
import { appendPendingEdit, MAX_HOME_PENDING_EDITS } from '../../src/lib/prism/home-indexeddb';

describe('H2 bounded local HomeDocument outbox', () => {
  it('keeps distinct pending revision pointers below the bound', () => {
    let items: ReturnType<typeof appendPendingEdit> = [];
    for (let i = 0; i < MAX_HOME_PENDING_EDITS; i++) items = appendPendingEdit(items, i, 1000 + i);
    expect(items).toHaveLength(MAX_HOME_PENDING_EDITS);
    expect(items.at(-1)).toMatchObject({ fromRevision: MAX_HOME_PENDING_EDITS - 1, toRevision: MAX_HOME_PENDING_EDITS });
  });

  it('coalesces overflow into one pending range without falsely acknowledging remote sync', () => {
    let items: ReturnType<typeof appendPendingEdit> = [];
    for (let i = 0; i < MAX_HOME_PENDING_EDITS + 7; i++) items = appendPendingEdit(items, i, 1000 + i);
    expect(items.length).toBeLessThanOrEqual(MAX_HOME_PENDING_EDITS);
    expect(items[0]).toMatchObject({ fromRevision: 0, savedAt: 1000, coalesced: true });
    expect(items.at(-1)?.toRevision).toBe(MAX_HOME_PENDING_EDITS + 7);
  });
});