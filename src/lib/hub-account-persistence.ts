import { shouldImportLegacyAccountToken } from './hub-account-token-mirror';
/** The SDK has a synchronous Storage contract. Load its small credential cache
 * before each operation and commit it before releasing the cross-tab lock.
 * IndexedDB has a separate quota from localStorage used by the app catalogue. */
export async function persistHubAccountStorage(fallback: Storage, keys: readonly string[], persistent: Storage | null) {
  let db: IDBDatabase | null = null;
  try {
    db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('thiepn-hub-account', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('session');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('ACCOUNT_STORAGE_BLOCKED'));
    });
    db.onversionchange = () => db?.close();
  } catch { /* Restricted browsers can still use the existing local/tab store. */ }
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
      // A readwrite transaction joins the same queue as the refresh lease and token commits.
      const transaction = db!.transaction('session', 'readwrite');
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
      // Durable tokens are authoritative for the same refresh-token lineage.
      // WebKit can present a delayed localStorage mirror after an IDB commit.
      // Never import a same-session mirror, or an older/equal-expiry token.
      const preventRollback = key.endsWith(':tokens') && record !== undefined &&
        !shouldImportLegacyAccountToken(record.value, currentLegacy);
      const importLegacy = changed && !preventRollback;
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

  // All IDB-capable tabs use the same durable lease. When Web Locks are
  // available, an additional unique lifetime lock proves that the lease owner
  // is still alive. A reload/navigation can terminate JS before its finally
  // handler runs; the browser releases that lifetime lock automatically.
  // Tabs without Web Locks keep the existing expiry-based fallback.
  const leaseKey = 'thiepn:hub-account-storage:refresh-lease';
  const lifetimeName = (owner: string) => leaseKey + ':owner:' + owner;
  type Lease = {owner: string; expiresAt: number; webLock?: boolean};
  type LeaseAttempt = {acquired: boolean; blocker?: Lease};
  async function withIdbLease<T>(operation: () => Promise<T>): Promise<T> {
    if (!db) return operation();
    const owner = crypto.randomUUID();
    const locks = navigator.locks;
    const deadline = Date.now() + 20_000;
    const transact = (mode:'acquire'|'release', abandoned?:string):Promise<LeaseAttempt>=>new Promise((resolve,reject)=>{
      const tx=db!.transaction('session','readwrite'),store=tx.objectStore('session');
      const request=store.get(leaseKey);
      let result:LeaseAttempt={acquired:false};
      request.onsuccess=()=>{
        const lease=request.result as Lease|undefined;
        if(mode==='release') {
          if(lease?.owner===owner)store.delete(leaseKey);
          return;
        }
        const valid = !!lease && typeof lease.owner==='string' &&
          typeof lease.expiresAt==='number' && Number.isFinite(lease.expiresAt);
        // Compare owner again inside this transaction: a different tab may
        // already have acquired the lease while the lifetime lock was probed.
        const abandonedOwner = valid && lease.webLock===true && lease.owner===abandoned;
        const canExpire = valid && lease.expiresAt<=Date.now() && (!lease.webLock||!locks);
        if(!valid||abandonedOwner||canExpire){
          store.put({owner,expiresAt:Date.now()+45_000,webLock:!!locks} satisfies Lease,leaseKey);
          result={acquired:true};
        }else result={acquired:false,blocker:lease};
      };
      tx.oncomplete=()=>resolve(result);
      tx.onabort=()=>reject(tx.error??new Error('ACCOUNT_STORAGE_LOCK_UNAVAILABLE'));
      tx.onerror=()=>{};
    });
    const perform = async () => {
      let abandoned:string|undefined;
      for(;;){
        const result=await transact('acquire',abandoned);
        if(result.acquired)break;
        if(Date.now()>=deadline)throw new Error('ACCOUNT_STORAGE_LOCK_UNAVAILABLE');
        abandoned=undefined;
        if(locks && result.blocker?.webLock===true &&
           /^[0-9a-f-]{36}$/i.test(result.blocker.owner)){
          const blockedOwner=result.blocker.owner;
          // A unique owner lock is never reused. A missing lock proves that
          // the previous document's operation cannot still write locally.
          const dead=await locks.request(lifetimeName(blockedOwner),{ifAvailable:true},
            lock=>lock!==null);
          if(dead){abandoned=blockedOwner;continue;}
        }
        await new Promise<void>(resolve=>setTimeout(resolve,100));
      }
      try { return await operation(); }
      finally { await transact('release'); }
    };
    // Hold the lifetime lock BEFORE advertising the lease, until after the
    // credential commit and lease release. No credentials enter lock names.
    return locks ? locks.request(lifetimeName(owner),perform) : perform();
  }
  // Serializing entire SDK operations also protects rotating refresh tokens.
  // Locking just the IDB writes would let two tabs refresh the same old token.
  let tail = Promise.resolve();
  function run<T>(operation: () => Promise<T> | T): Promise<T> {
    const perform = async () => {
      await flush();
      await load();
      try { return await operation(); } finally { await flush(); }
    };
    // All IDB-capable tabs must contend on the SAME lease, including tabs
    // with Web Locks and tabs without them. Separate locks permit overlap.
    const work = tail.then(() => db
      ? withIdbLease(perform)
      : navigator.locks ? navigator.locks.request('thiepn:hub-account-storage', perform) : perform());
    tail = work.then(() => {}, () => {});
    return work;
  }
  await run(() => {});
  return {storage, run, flush};
}
