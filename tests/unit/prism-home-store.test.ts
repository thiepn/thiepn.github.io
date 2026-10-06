import { describe, expect, it, vi } from 'vitest';
import {
  bootstrapHomeDocument,
  HomeStore,
  homeDocumentStorageKey,
  parseStoredHomeDocument,
  type HomePersistence,
} from '../../src/lib/prism/home-store';
import { createDefaultHomeDocument } from '../../src/lib/prism/home-document';

const owner = '11111111-1111-4111-8111-111111111111';
const available = ['notes', 'mathlab', 'tms60'];

const legacy = JSON.stringify({
  version: 1,
  pins: ['mathlab', 'notes'],
  density: 'comfortable',
  home: {
    modules: ['today', 'continue', 'study'],
    mode: 'today',
    focus: 'study',
    timezone: 'Europe/Berlin',
    hidden: false,
  },
});

describe('Prism Home local bootstrap and storage', () => {
  it('partitions guest and account HomeDocument keys', () => {
    expect(homeDocumentStorageKey(null)).toBe('thiepn:home-document:v2');
    expect(homeDocumentStorageKey(owner)).toBe(`thiepn:home-document:user:${owner}:v2`);
    expect(() => homeDocumentStorageKey('not-an-account')).toThrow('Invalid account identity');
  });

  it('prefers a valid V2 document over legacy V1 state', () => {
    const v2 = createDefaultHomeDocument();
    v2.appearance.density = 'balanced';
    const result = bootstrapHomeDocument({
      rawV2: JSON.stringify(v2),
      rawV1: legacy,
      availableApps: available,
    });
    expect(result.source).toBe('v2');
    expect(result.document.appearance.density).toBe('balanced');
    expect(result.remainder).toBeNull();
  });

  it('falls back to V1 migration when stored V2 is invalid', () => {
    const result = bootstrapHomeDocument({
      rawV2: '{"schemaVersion":999}',
      rawV1: legacy,
      availableApps: available,
    });
    expect(result.source).toBe('v1');
    expect(result.reset).toBe(true);
    expect(result.document.appearance.density).toBe('comfortable');
    expect(result.document.blocks['block-apps']?.settings).toEqual({ appOrder: ['mathlab', 'notes'] });
    expect(result.remainder?.legacyHomeView.timezone).toBe('Europe/Berlin');
  });

  it('uses the canonical Prism default when no previous state exists', () => {
    const result = bootstrapHomeDocument({ rawV2: null, rawV1: null, availableApps: available });
    expect(result.source).toBe('default');
    expect(result.reset).toBe(false);
    expect(result.document.appearance.density).toBe('balanced');
  });

  it('rejects malformed and oversized stored V2 documents', () => {
    expect(parseStoredHomeDocument('{').reset).toBe(true);
    expect(parseStoredHomeDocument('x'.repeat(128 * 1024 + 1)).reset).toBe(true);
  });
});

describe('Prism HomeStore durability', () => {
  it('persists before publishing a successful mutation', async () => {
    const saves: string[] = [];
    const persistence: HomePersistence = {
      async load() { return null; },
      async save(raw) { saves.push(raw); },
    };
    const store = new HomeStore(createDefaultHomeDocument(), persistence);
    const listener = vi.fn();
    store.subscribe(listener);

    await store.mutate((draft) => {
      draft.appearance.density = 'compact';
    });

    expect(saves).toHaveLength(1);
    expect(JSON.parse(saves[0]!).appearance.density).toBe('compact');
    expect(store.getSnapshot().appearance.density).toBe('compact');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('keeps the previous snapshot when persistence fails', async () => {
    const persistence: HomePersistence = {
      async load() { return null; },
      async save() { throw new Error('storage failed'); },
    };
    const store = new HomeStore(createDefaultHomeDocument(), persistence);

    await expect(store.mutate((draft) => {
      draft.appearance.density = 'compact';
    })).rejects.toThrow('storage failed');

    expect(store.getSnapshot().appearance.density).toBe('balanced');
  });

  it('rejects invalid mutations before persistence', async () => {
    const save = vi.fn(async () => {});
    const store = new HomeStore(createDefaultHomeDocument(), { load: async () => null, save });

    await expect(store.mutate((draft) => {
      const now = draft.layouts.mobile.placements.find((placement) => placement.blockId === 'block-now')!;
      now.x = 3;
      now.w = 4;
    })).rejects.toThrow('Invalid HomeDocument mutation');

    expect(save).not.toHaveBeenCalled();
  });
});


describe('Prism HomeStore Undo', () => {
  it('restores and persists the previous valid document', async () => {
    const saves: string[] = [];
    const store = new HomeStore(createDefaultHomeDocument(), {
      load: async () => null,
      save: async (raw) => { saves.push(raw); },
    });

    await store.mutate((draft) => {
      draft.appearance.density = 'compact';
    });
    expect(store.canUndo()).toBe(true);
    expect(store.getSnapshot().appearance.density).toBe('compact');

    await expect(store.undo()).resolves.toBe(true);
    expect(store.getSnapshot().appearance.density).toBe('balanced');
    expect(store.canUndo()).toBe(false);
    expect(JSON.parse(saves.at(-1)!).appearance.density).toBe('balanced');
  });

  it('keeps history intact when an undo cannot be persisted', async () => {
    let fail = false;
    const store = new HomeStore(createDefaultHomeDocument(), {
      load: async () => null,
      save: async () => { if (fail) throw new Error('undo storage failed'); },
    });

    await store.mutate((draft) => {
      draft.appearance.density = 'compact';
    });
    fail = true;

    await expect(store.undo()).rejects.toThrow('undo storage failed');
    expect(store.getSnapshot().appearance.density).toBe('compact');
    expect(store.canUndo()).toBe(true);
  });

  it('returns false when there is no history to undo', async () => {
    const store = new HomeStore(createDefaultHomeDocument(), {
      load: async () => null,
      save: async () => {},
    });
    await expect(store.undo()).resolves.toBe(false);
  });
});
