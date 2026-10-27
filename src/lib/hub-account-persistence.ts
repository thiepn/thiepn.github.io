/** The SDK has a synchronous Storage contract. Load its small credential cache
 * before each operation and commit it before releasing the cross-tab lock.
 * IndexedDB has a separate quota from localStorage used by the app catalogue. */
export async function persistHubAccountStorage(fallback: Storage, keys: readonly string[], persistent: Storage | null) {
  let db: IDBDatabase | null = null;
  // Contending tab startups can transiently fail to open an Account DB.
  // Do not silently downgrade the rotating-token lock to uncoordinated
  // localStorage in that case. Only explicit browser storage denial may fall
  // back to the legacy/tab adapter.
  for (let attempt=0; attempt<4; attempt++) {
    try {
      db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('thiepn-hub-account', 1);
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains('session'))
            request.result.createObjectStore('session');
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('ACCOUNT_STORAGE_OPEN_FAILED'));
        request.onblocked = () => reject(new Error('ACCOUNT_STORAGE_BLOCKED'));
      });
      db.onversionchange = () => db?.close();
      break;
    } catch(error) {
      if (error instanceof DOMException &&
          ['SecurityError','NotAllowedError','QuotaExceededError'].includes(error.name)) break;
      if (attempt===3) throw error;
      await new Promise<void>(resolve=>setTimeout(resolve,100*(attempt+1)));
    }
  }
  const cache = new Map<string, string | null>();
  let pending = Promise.resolve(), writeError: unknown;
  const assertKey = (key: string) => { if (!keys.includes(key)) throw new Error('ACCOUNT_STORAGE_KEY_INVALID'); };
  type Record = {value: string | null; legacy: string | null | undefined};
  function legacy(key: string): string | null | undefined {
    try { return persistent ? persistent.getItem(key) : undefined; } catch { return undefined; }
  }
  function write(key: string, value: string | null, previous = legacy(key)): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = db!.transaction('session', 'readwrite');
      // Null is a durable sign-out tombstone, not an absent migration record.
      transaction.objectStore('session').put({value, legacy: previous} satisfies Record, key);
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error ?? new Error('ACCOUNT_STORAGE_WRITE_FAILED'));
      transaction.onerror = () => {};
    });
  }
  async function flush() {
    await pending;
    if (writeError) throw writeError;
  }
  async function load() {
    if (!db) return;
    const values = await new Promise<(Record | undefined)[]>((resolve, reject) => {
      const transaction = db!.transaction('session', 'readonly');
      const requests = keys.map(key => transaction.objectStore('session').get(key));
      transaction.oncomplete = () => resolve(requests.map(request => request.result));
      transaction.onabort = () => reject(transaction.error);
      transaction.onerror = () => {};
    });
    for (const [index, key] of keys.entries()) {
      const record = values[index], currentLegacy = legacy(key);
      if (record !== undefined && (!record || (record.value !== null && typeof record.value !== 'string'))) throw new Error('ACCOUNT_STORAGE_INVALID');
      // Older open Hub tabs still write localStorage. Import a changed legacy
      // record, but never replace a durable credential with an unchanged stale
      // local record left behind by a quota failure.
      const changed = record !== undefined && currentLegacy !== undefined && currentLegacy !== record.legacy;
      // Once an OAuth token has a durable record it is authoritative.
      // ExpiresAt cannot order rotating refresh tokens: a stale tab may
      // overwrite a mirror with a later expiry but an already consumed token.
      // Never import that mirror over the committed IDB credential/tombstone.
      // Only the first import from pre-durable versions is permitted.
      const importLegacy = changed && (!key.endsWith(':tokens') || record === undefined);
      cache.set(key, importLegacy ? currentLegacy! : record === undefined ? fallback.getItem(key) : record.value);
      if (record === undefined || importLegacy) await write(key, cache.get(key)!, currentLegacy);
    }
  }
  const storage: Storage = {
    get length() { return keys.filter(key => storage.getItem(key) !== null).length; },
    key: index => keys.filter(key => storage.getItem(key) !== null)[index] ?? null,
    clear() { for (const key of keys) storage.removeItem(key); },
    getItem(key) { assertKey(key); return db ? cache.get(key) ?? null : fallback.getItem(key); },
    setItem(key, value) {
      assertKey(key);
      if (!db) { fallback.setItem(key, value); return; }
      // Keep the old store usable on browsers that subsequently block IDB.
      try { fallback.setItem(key, value); } catch { /* IDB remains writable. */ }
      cache.set(key, value);
      const previous = legacy(key);
      pending = pending.then(() => write(key, value, previous)).catch(error => { writeError = error; });
    },
    removeItem(key) {
      assertKey(key);
      if (!db) { fallback.removeItem(key); return; }
      try { fallback.removeItem(key); } catch { /* The durable tombstone wins. */ }
      cache.set(key, null);
      const previous = legacy(key);
      pending = pending.then(() => write(key, null, previous)).catch(error => { writeError = error; });
    },
  };

  // Web Locks may be absent in Safari. This IndexedDB transaction provides a
  // cross-tab lease before reading or rotating any Account credentials.
  // The lease never contains tokens and is not exposed through SDK storage.
  // Without durable IDB or native Web Locks a rotating refresh-token
  // request has no safe cross-tab exclusion. Keep fresh offline credentials
  // usable, but never send a potentially duplicate spent token.
  function assertSafeFallback() {
    if (db || navigator.locks) return;
    const tokenKey=keys.find(key=>key.endsWith(':tokens'));
    if (!tokenKey) return;
    const raw=storage.getItem(tokenKey);
    if (!raw) return;
    let expiry:unknown;
    try { expiry=(JSON.parse(raw) as {expiresAt?:unknown}).expiresAt; }
    catch { throw new Error('ACCOUNT_STORAGE_LOCK_UNAVAILABLE'); }
    if (typeof expiry!=='number'||!Number.isFinite(expiry)||
        expiry-Date.now()<=30_000)
      throw new Error('ACCOUNT_STORAGE_LOCK_UNAVAILABLE');
  }
  const leaseKey = 'thiepn:hub-account-storage:refresh-lease';
  async function withIdbLease<T>(operation: () => Promise<T>): Promise<T> {
    if (!db) return operation(); // Preserve the restricted-storage fallback.
    const owner = crypto.randomUUID();
    const deadline = Date.now() + 20_000;
    const transact = (mode:'acquire'|'release'):Promise<boolean>=>new Promise((resolve,reject)=>{
      const tx=db!.transaction('session','readwrite'),store=tx.objectStore('session');
      const request=store.get(leaseKey);
      let acquired=false;
      request.onsuccess=()=>{
        const lease=request.result as {owner?:unknown;expiresAt?:unknown}|undefined;
        if(mode==='release') {
          if(lease?.owner===owner)store.delete(leaseKey);
        } else if(!lease||typeof lease.expiresAt!=='number'||lease.expiresAt<=Date.now()){
          store.put({owner,expiresAt:Date.now()+45_000},leaseKey);
          acquired=true;
        }
      };
      tx.oncomplete=()=>resolve(acquired);
      tx.onabort=()=>reject(tx.error??new Error('ACCOUNT_STORAGE_LOCK_UNAVAILABLE'));
      tx.onerror=()=>{};
    });
    while(!(await transact('acquire'))){
      if(Date.now()>=deadline)throw new Error('ACCOUNT_STORAGE_LOCK_UNAVAILABLE');
      await new Promise<void>(resolve=>setTimeout(resolve,100));
    }
    try { return await operation(); }
    finally { await transact('release'); }
  }
  // Serializing entire SDK operations also protects rotating refresh tokens.
  // Locking just the IDB writes would let two tabs refresh the same old token.
  let tail = Promise.resolve();
  function run<T>(operation: () => Promise<T> | T): Promise<T> {
    const perform = async () => {
      await flush();
      await load();
      assertSafeFallback();
      try { return await operation(); } finally { await flush(); }
    };
    const work = tail.then(() => navigator.locks
      ? navigator.locks.request('thiepn:hub-account-storage', perform)
      : withIdbLease(perform));
    tail = work.then(() => {}, () => {});
    return work;
  }
  await run(() => {});
  return {storage, run, flush};
}
