import { preferenceKey, validAccountId } from '../hub-auth';
import { parseHubPreferences } from '../hub-preferences';
import { createDefaultHomeDocument, validateHomeDocument, type HomeDocumentV2 } from './home-document';
import { migrateHubPreferencesV1, type HomeMigrationRemainder } from './migrate-hub-preferences';

export const HOME_DOCUMENT_STORAGE_KEY = 'thiepn:home-document:v2';
export const MAX_HOME_DOCUMENT_BYTES = 128 * 1024;

export function homeDocumentStorageKey(owner: string | null): string {
  if (owner === null) return HOME_DOCUMENT_STORAGE_KEY;
  if (!validAccountId(owner)) throw new Error('Invalid account identity');
  return `thiepn:home-document:user:${owner.toLowerCase()}:v2`;
}

export interface ParsedStoredHome {
  document: HomeDocumentV2 | null;
  reset: boolean;
}

export function parseStoredHomeDocument(raw: string | null): ParsedStoredHome {
  if (raw === null) return { document: null, reset: false };
  try {
    if (new TextEncoder().encode(raw).byteLength > MAX_HOME_DOCUMENT_BYTES) throw new Error('Oversized HomeDocument');
    const value: unknown = JSON.parse(raw);
    const validation = validateHomeDocument(value);
    if (!validation.valid) throw new Error(validation.errors.join(' | '));
    return { document: value as HomeDocumentV2, reset: false };
  } catch {
    return { document: null, reset: true };
  }
}

export interface HomeBootstrapInput {
  rawV2: string | null;
  rawV1: string | null;
  availableApps: readonly string[];
}

export interface HomeBootstrapResult {
  document: HomeDocumentV2;
  source: 'v2' | 'v1' | 'default';
  reset: boolean;
  remainder: HomeMigrationRemainder | null;
}

export function bootstrapHomeDocument(input: HomeBootstrapInput): HomeBootstrapResult {
  const stored = parseStoredHomeDocument(input.rawV2);
  if (stored.document) {
    return { document: structuredClone(stored.document), source: 'v2', reset: false, remainder: null };
  }

  if (input.rawV1 !== null) {
    const parsed = parseHubPreferences(input.rawV1, input.availableApps);
    const migrated = migrateHubPreferencesV1(parsed.preferences);
    return {
      document: migrated.document,
      source: 'v1',
      reset: stored.reset || parsed.reset,
      remainder: migrated.remainder,
    };
  }

  return {
    document: createDefaultHomeDocument(),
    source: 'default',
    reset: stored.reset,
    remainder: null,
  };
}

export interface HomePersistence {
  load(): Promise<string | null>;
  save(raw: string): Promise<void>;
}

export function createBrowserHomePersistence(storage: Storage, owner: string | null): HomePersistence {
  const key = homeDocumentStorageKey(owner);
  return {
    async load() {
      return storage.getItem(key);
    },
    async save(raw) {
      if (new TextEncoder().encode(raw).byteLength > MAX_HOME_DOCUMENT_BYTES) throw new Error('HomeDocument exceeds storage budget');
      storage.setItem(key, raw);
    },
  };
}

export function readLegacyPreference(storage: Storage, owner: string | null): string | null {
  return storage.getItem(preferenceKey(owner));
}

type HomeListener = (document: HomeDocumentV2) => void;

export class HomeStore {
  #document: HomeDocumentV2;
  #persistence: HomePersistence;
  #listeners = new Set<HomeListener>();
  #history: HomeDocumentV2[] = [];
  #maxHistory = 50;
  #pending: Promise<void> = Promise.resolve();

  constructor(document: HomeDocumentV2, persistence: HomePersistence) {
    const validation = validateHomeDocument(document);
    if (!validation.valid) throw new Error(`Invalid initial HomeDocument: ${validation.errors.join(' | ')}`);
    this.#document = structuredClone(document);
    this.#persistence = persistence;
  }

  getSnapshot(): HomeDocumentV2 {
    return structuredClone(this.#document);
  }

  subscribe(listener: HomeListener): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  canUndo(): boolean {
    return this.#history.length > 0;
  }

  clearHistory(): void {
    this.#history = [];
  }

  #publish(): void {
    for (const listener of this.#listeners) listener(this.getSnapshot());
  }

  // External tab revisions clear Undo; a stale tab cannot apply old inverse actions to new state.
  async #reloadPersisted(): Promise<boolean> {
    const result = parseStoredHomeDocument(await this.#persistence.load());
    if (!result.document) throw new Error('Durable HomeDocument missing or invalid');
    const changed = JSON.stringify(this.#document) !== JSON.stringify(result.document);
    this.#document = structuredClone(result.document);
    this.#history = [];
    if (changed) this.#publish();
    return changed;
  }

  refreshFromPersistence(): Promise<boolean> {
    return this.#enqueue(() => this.#reloadPersisted());
  }

  #enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.#pending.then(operation);
    this.#pending = result.then(() => {}, () => {});
    return result;
  }

  replace(next: HomeDocumentV2, options: { recordHistory?: boolean } = {}): Promise<void> {
    const candidate = structuredClone(next);
    return this.#enqueue(() => this.#replace(candidate, options));
  }

  async #replace(next: HomeDocumentV2, options: { recordHistory?: boolean }): Promise<void> {
    const candidate = structuredClone(next);
    const validation = validateHomeDocument(candidate);
    if (!validation.valid) throw new Error(`Invalid HomeDocument mutation: ${validation.errors.join(' | ')}`);
    const raw = JSON.stringify(candidate);
    if (new TextEncoder().encode(raw).byteLength > MAX_HOME_DOCUMENT_BYTES) throw new Error('HomeDocument exceeds storage budget');

    const current = this.getSnapshot();
    const changed = JSON.stringify(current) !== raw;

    try {
      await this.#persistence.save(raw);
    } catch (error) {
      if ((error as Error)?.name === 'HomeRevisionConflict') await this.#reloadPersisted();
      throw error;
    }
    if (!changed) return;

    if (options.recordHistory !== false) {
      this.#history.push(current);
      if (this.#history.length > this.#maxHistory) this.#history.splice(0, this.#history.length - this.#maxHistory);
    }
    this.#document = candidate;
    this.#publish();
  }

  mutate(mutator: (draft: HomeDocumentV2) => void): Promise<void> {
    return this.#enqueue(async () => {
      const candidate = this.getSnapshot();
      mutator(candidate);
      // A rejected or unchanged UI action must not consume storage quota or create an Undo entry.
      // replace() still persists identical V1 migrations during bootstrap.
      if (JSON.stringify(candidate) === JSON.stringify(this.#document)) return;
      await this.#replace(candidate, {});
    });
  }

  undo(): Promise<boolean> {
    return this.#enqueue(() => this.#undo());
  }

  async #undo(): Promise<boolean> {
    const previous = this.#history.at(-1);
    if (!previous) return false;

    const candidate = structuredClone(previous);
    const validation = validateHomeDocument(candidate);
    if (!validation.valid) throw new Error(`Invalid HomeDocument history: ${validation.errors.join(' | ')}`);
    const raw = JSON.stringify(candidate);

    try {
      await this.#persistence.save(raw);
    } catch (error) {
      if ((error as Error)?.name === 'HomeRevisionConflict') await this.#reloadPersisted();
      throw error;
    }
    this.#history.pop();
    this.#document = candidate;
    this.#publish();
    return true;
  }
}
