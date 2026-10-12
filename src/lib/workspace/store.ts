import { validAccountId } from '../hub-auth';
import { parseState } from './model';
import type { WorkspaceState, EditDraft } from './types';
export function namespace(owner: string | null) { if (owner !== null && !validAccountId(owner))
    throw new Error('Invalid account identity'); return owner === null ? 'guest' : `user:${owner.toLowerCase()}`; }
export class RevisionConflict extends Error {
    constructor() { super('This workspace changed in another tab. Your changes are preserved; reload or export them before retrying.'); }
}
export class WorkspaceStore {
    private db: IDBDatabase | null = null;
    constructor(readonly key: string) { }
    async open() { this.db = await new Promise<IDBDatabase>((resolve, reject) => { const r = indexedDB.open('thiepn-adaptive-workspace', 1); r.onupgradeneeded = () => { for (const n of ['records', 'drafts', 'backups'])
        if (!r.result.objectStoreNames.contains(n))
            r.result.createObjectStore(n); }; r.onsuccess = () => { r.result.onversionchange = () => r.result.close(); resolve(r.result); }; r.onerror = () => reject(r.error); r.onblocked = () => reject(new Error('Close another Hub tab to finish opening storage.')); }); }
    private read(store: string) { return new Promise<unknown>((resolve, reject) => { if (!this.db) {
        reject(new Error('Storage unavailable'));
        return;
    } const r = this.db.transaction(store).objectStore(store).get(this.key); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); }); }
    async load() { const raw = await this.read('records'); return raw === undefined ? null : parseState(String(raw)); }
    async raw() { return String(await this.read('records') ?? ''); }
    async save(state: WorkspaceState, expected: number, backup = false) { const valid = parseState(JSON.stringify(state)); await new Promise<void>((resolve, reject) => { if (!this.db) {
        reject(new Error('Storage unavailable'));
        return;
    } const tx = this.db.transaction(backup ? ['records', 'backups'] : ['records'], 'readwrite'); const store = tx.objectStore('records'); let error: Error | null = null; const get = store.get(this.key); get.onsuccess = () => { try {
        const previous = get.result === undefined ? null : parseState(String(get.result));
        if ((previous?.revision ?? 0) !== expected)
            throw new RevisionConflict();
        if (backup && previous)
            tx.objectStore('backups').put(JSON.stringify(previous), this.key);
        valid.revision = expected + 1;
        store.put(JSON.stringify(valid), this.key);
    }
    catch (e) {
        error = e as Error;
        tx.abort();
    } }; tx.oncomplete = () => { state.revision = valid.revision; resolve(); }; tx.onabort = () => reject(error ?? tx.error ?? new Error('Save failed')); tx.onerror = () => reject(error ?? tx.error); }); }
    async draft(value?: EditDraft | null) { if (value === undefined)
        return await this.read('drafts') as EditDraft | null; await new Promise<void>((resolve, reject) => { if (!this.db) {
        reject(new Error('Storage unavailable'));
        return;
    } const tx = this.db.transaction('drafts', 'readwrite'); if (value === null)
        tx.objectStore('drafts').delete(this.key);
    else
        tx.objectStore('drafts').put(value, this.key); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); }); return null; }
    async backup() { const raw = await this.read('backups'); return raw === undefined ? null : parseState(String(raw)); }
    close() { this.db?.close(); this.db = null; }
}
