/** Account credentials can use tab storage when other apps fill this origin's
 * localStorage. Fallback records override stale persistent values, including
 * sign-out tombstones. Never evict another app's data to make room. */
export function createHubAccountStorage(persistent: Storage | null, tab: Storage, keys: readonly string[]): Storage & {reconcilePersistentChange(key: string): void} {
  const allowed = new Set(keys);
  const prefix = 'thiepn:hub-account-fallback:';
  function assertKey(key: string) {
    if (!allowed.has(key)) throw new Error('ACCOUNT_STORAGE_KEY_INVALID');
  }
  function fallback(key: string): string | null | undefined {
    const raw = tab.getItem(prefix + key);
    if (raw === null) return undefined;
    const value: unknown = JSON.parse(raw);
    if (value !== null && typeof value !== 'string') throw new Error('ACCOUNT_STORAGE_INVALID');
    return value;
  }
  const storage: Storage & {reconcilePersistentChange(key: string): void} = {
    reconcilePersistentChange(key) { assertKey(key); tab.removeItem(prefix + key); },
    get length() { return keys.filter(key => storage.getItem(key) !== null).length; },
    key(index) { return keys.filter(key => storage.getItem(key) !== null)[index] ?? null; },
    clear() { for (const key of keys) storage.removeItem(key); },
    getItem(key) {
      assertKey(key);
      const value = fallback(key);
      if (value !== undefined) return value;
      try { return persistent?.getItem(key) ?? null; }
      catch { return null; }
    },
    setItem(key, value) {
      assertKey(key);
      // Keep a tab's existing fallback authoritative until it is removed.
      if (fallback(key) === undefined && persistent) {
        try { persistent.setItem(key, value); return; } catch { /* Full or blocked persistent storage. */ }
      }
      tab.setItem(prefix + key, JSON.stringify(value));
    },
    removeItem(key) {
      assertKey(key);
      try {
        if (!persistent) throw new Error('ACCOUNT_PERSISTENT_STORAGE_UNAVAILABLE');
        persistent.removeItem(key);
        tab.removeItem(prefix + key);
      } catch {
        // A stale persistent credential must not reappear after local sign-out.
        tab.setItem(prefix + key, 'null');
      }
    },
  };
  return storage;
}
