import { validAccountId } from '../hub-auth';
import { homeDocumentStorageKey, MAX_HOME_DOCUMENT_BYTES, parseStoredHomeDocument, type HomePersistence } from './home-store';

// Local recovery journal only. No Core document-sync endpoint is deployed or assumed.
const DATABASE = 'thiepn-hub-home-v1';
const STORE = 'home-records';
export const MAX_HOME_PENDING_EDITS = 32;

export interface PendingHomeEdit {
  fromRevision: number;
  toRevision: number;
  savedAt: number;
  coalesced: boolean;
}
export interface StoredHomeRecord {
  key: string;
  raw: string;
  revision: number;
  pending: PendingHomeEdit[];
}
export class HomeRevisionConflict extends Error {
  constructor() {
    super('HomeDocument changed in another tab. Changes were not overwritten.');
    this.name = 'HomeRevisionConflict';
  }
}

export function appendPendingEdit(pending: readonly PendingHomeEdit[], fromRevision: number, now: number): PendingHomeEdit[] {
  const next = [...pending, { fromRevision, toRevision: fromRevision + 1, savedAt: now, coalesced: false }];
  if (next.length <= MAX_HOME_PENDING_EDITS) return next;
  // Latest full snapshot remains durable; consolidate unsent revision intents without claiming delivery.
  return [{ fromRevision: next[0]!.fromRevision, toRevision: next.at(-1)!.toRevision, savedAt: next[0]!.savedAt, coalesced: true }];
}
function assertValidRaw(raw: string): void {
  if (new TextEncoder().encode(raw).byteLength > MAX_HOME_DOCUMENT_BYTES || !parseStoredHomeDocument(raw).document) {
    throw new Error('Invalid HomeDocument for durable persistence');
  }
}
function readRecord(value: unknown, key: string): StoredHomeRecord | null {
  if (value == null) return null;
  if (typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid IndexedDB Home record');
  const item = value as Partial<StoredHomeRecord>;
  if (item.key !== key || typeof item.raw !== 'string' || !Number.isSafeInteger(item.revision) || item.revision! < 1
    || !Array.isArray(item.pending) || item.pending.length > MAX_HOME_PENDING_EDITS
    || !item.pending.every(p => p && Number.isSafeInteger(p.fromRevision) && Number.isSafeInteger(p.toRevision)
      && p.fromRevision >= 0 && p.toRevision > p.fromRevision && Number.isFinite(p.savedAt)
      && typeof p.coalesced === 'boolean')) throw new Error('Invalid IndexedDB Home revision or journal');
  assertValidRaw(item.raw);
  return item as StoredHomeRecord;
}
function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}
function openHomeDatabase(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = factory.open(DATABASE, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: 'key' });
    };
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    req.onerror = () => reject(req.error ?? new Error('IndexedDB unavailable'));
    req.onblocked = () => reject(new Error('IndexedDB upgrade blocked by another tab'));
  });
}

export interface DurableHomePersistence extends HomePersistence {
  readonly key: string;
  readonly needsImport: boolean;
  getPending(): Promise<readonly PendingHomeEdit[]>;
  subscribe(onChanged: () => void): () => void;
  close(): void;
}

export function createIndexedHomePersistence(
  owner: string | null,
  legacyStorage: Pick<Storage, 'getItem' | 'setItem'>,
  options: { factory?: IDBFactory; BroadcastChannelImpl?: typeof BroadcastChannel; now?: () => number } = {},
): DurableHomePersistence {
  if (owner !== null && !validAccountId(owner)) throw new Error('Invalid account identity');
  const key = homeDocumentStorageKey(owner);
  const factory = options.factory ?? globalThis.indexedDB;
  if (!factory) throw new Error('IndexedDB is unavailable; HomeDocument durability cannot be guaranteed');
  const now = options.now ?? Date.now;
  const Broadcast = options.BroadcastChannelImpl ?? globalThis.BroadcastChannel;
  const channel = Broadcast ? new Broadcast('thiepn:prism-home-updates:v1') : null;
  const listeners = new Set<() => void>();
  let expectedRevision: number | null = null;
  let closed = false;
  let needsImport = false;
  let cachedDb: Promise<IDBDatabase> | null = null;
  const db = () => cachedDb ??= openHomeDatabase(factory);
  channel?.addEventListener('message', (event: MessageEvent<unknown>) => {
    if (closed || !event.data || typeof event.data !== 'object') return;
    const payload = event.data as { key?: unknown; revision?: unknown };
    if (payload.key !== key || !Number.isSafeInteger(payload.revision)) return;
    if (expectedRevision !== null && payload.revision === expectedRevision) return;
    for (const listener of listeners) listener();
  });
  return {
    key,
    get needsImport() { return needsImport; },
    async load() {
      if (closed) throw new Error('Home persistence is closed');
      const database = await db();
      const result = await requestResult(database.transaction(STORE, 'readonly').objectStore(STORE).get(key));
      const record = readRecord(result, key);
      expectedRevision = record?.revision ?? 0;
      needsImport = record === null;
      // One-way legacy import: the previous V2 key survives for compatibility.
      return record?.raw ?? legacyStorage.getItem(key);
    },
    async save(raw) {
      if (closed) throw new Error('Home persistence is closed');
      assertValidRaw(raw);
      if (expectedRevision === null) throw new Error('Home persistence must be loaded before saving');
      const database = await db();
      const revision = await new Promise<number>((resolve, reject) => {
        const tx = database.transaction(STORE, 'readwrite');
        const store = tx.objectStore(STORE);
        let nextRevision: number | null = null;
        let failure: unknown = null;
        tx.oncomplete = () => resolve(nextRevision!);
        tx.onerror = () => reject(tx.error ?? new Error('Home write failed'));
        tx.onabort = () => reject(failure ?? tx.error ?? new Error('Home write aborted'));
        const request = store.get(key);
        request.onsuccess = () => {
          try {
            const current = readRecord(request.result, key);
            const previous = current?.revision ?? 0;
            if (previous !== expectedRevision) throw new HomeRevisionConflict();
            nextRevision = previous + 1;
            const next: StoredHomeRecord = {
              key, raw, revision: nextRevision,
              pending: appendPendingEdit(current?.pending ?? [], previous, now()),
            };
            store.put(next);
          } catch (error) {
            failure = error;
            tx.abort();
          }
        };
      });
      expectedRevision = revision;
      needsImport = false;
      // Legacy mirror is compatibility-only; a failed mirror cannot invalidate a committed IDB transaction.
      try { legacyStorage.setItem(key, raw); } catch { /* IndexedDB remains authoritative. */ }
      channel?.postMessage({ key, revision });
    },
    async getPending() {
      if (closed) throw new Error('Home persistence is closed');
      const database = await db();
      const record = readRecord(await requestResult(database.transaction(STORE, 'readonly').objectStore(STORE).get(key)), key);
      return record ? structuredClone(record.pending) : [];
    },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    close() { closed = true; listeners.clear(); channel?.close(); void cachedDb?.then(d => d.close()); },
  };
}
