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

  async replace(next: HomeDocumentV2): Promise<void> {
    const candidate = structuredClone(next);
    const validation = validateHomeDocument(candidate);
    if (!validation.valid) throw new Error(`Invalid HomeDocument mutation: ${validation.errors.join(' | ')}`);
    const raw = JSON.stringify(candidate);
    if (new TextEncoder().encode(raw).byteLength > MAX_HOME_DOCUMENT_BYTES) throw new Error('HomeDocument exceeds storage budget');

    await this.#persistence.save(raw);
    this.#document = candidate;
    for (const listener of this.#listeners) listener(this.getSnapshot());
  }

  async mutate(mutator: (draft: HomeDocumentV2) => void): Promise<void> {
    const candidate = this.getSnapshot();
    mutator(candidate);
    await this.replace(candidate);
  }
}
