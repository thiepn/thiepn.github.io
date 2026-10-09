import { test, expect } from '@playwright/test';

const route = '/home/prism-preview/';
const dbName = 'thiepn-hub-home-v1';
const storeName = 'home-records';
const guestKey = 'thiepn:home-document:v2';

test('H2 offline edits are durable locally and remain pending after reconnect', async ({ page, context }) => {
  await page.goto(route);
  await expect(page.locator('[data-prism-home]')).toHaveAttribute('data-prism-storage', 'indexeddb');
  await expect(page.locator('[data-prism-home]')).toHaveAttribute('data-prism-migration', 'persisted');
  await page.locator('.prism-topbar__customize').click();
  await page.locator('[data-prism-theme-open]').click();
  await context.setOffline(true);
  await page.locator('[data-prism-appearance="density"]').selectOption('compact');
  await expect(page.locator('[data-prism-home]')).toHaveAttribute('data-density', 'compact');
  const offlineRecord = await page.evaluate(async ({ dbName, storeName, guestKey }) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(dbName);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const result = await new Promise<any>((resolve, reject) => {
      const request = db.transaction(storeName).objectStore(storeName).get(guestKey);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return result;
  }, { dbName, storeName, guestKey });
  expect(offlineRecord).toMatchObject({ key: guestKey });
  expect(JSON.parse(offlineRecord.raw).appearance.density).toBe('compact');
  expect(offlineRecord.pending.length).toBeGreaterThan(0);
  await context.setOffline(false);
  await page.reload();
  await expect(page.locator('[data-prism-home]')).toHaveAttribute('data-density', 'compact');
  await expect(page.locator('[data-prism-home]')).toHaveAttribute('data-prism-sync', 'local-pending-no-server');
});

test('H2 cross-tab mutations reconcile using same-origin revision signals', async ({ page, context }) => {
  await page.goto(route);
  const second = await context.newPage();
  await second.goto(route);
  await second.locator('.prism-topbar__customize').click();
  await expect(second.locator('[data-prism-undo]')).toBeDisabled();
  await page.locator('.prism-topbar__customize').click();
  await page.locator('[data-prism-theme-open]').click();
  await page.locator('[data-prism-appearance="density"]').selectOption('comfortable');
  await expect(second.locator('[data-prism-home]')).toHaveAttribute('data-density', 'comfortable');
  await expect(second.locator('[data-prism-undo]')).toBeDisabled();
  await second.close();
});


test('H2 account partitions never reuse guest or another account customization', async ({ page }) => {
  await page.goto(route);
  const first = '11111111-1111-4111-8111-111111111111';
  const second = '22222222-2222-4222-8222-222222222222';
  const switchIdentity = (id: string | null) => page.evaluate((identity) => {
    window.dispatchEvent(new CustomEvent('hub:identity', {
      detail: identity ? { status: 'signed-in', id: identity, label: 'Test fixture' } : { status: 'signed-out' },
    }));
  }, id);
  await switchIdentity(first);
  await expect(page.locator('[data-prism-home]')).toHaveAttribute('data-prism-home-source', 'default');
  await page.locator('.prism-topbar__customize').click();
  await page.locator('[data-prism-theme-open]').click();
  await page.locator('[data-prism-appearance="density"]').selectOption('comfortable');
  await expect(page.locator('[data-prism-home]')).toHaveAttribute('data-density', 'comfortable');
  await switchIdentity(second);
  await expect(page.locator('[data-prism-home]')).toHaveAttribute('data-density', 'balanced');
  await switchIdentity(null);
  await expect(page.locator('[data-prism-home]')).toHaveAttribute('data-density', 'balanced');
  await switchIdentity(first);
  await expect(page.locator('[data-prism-home]')).toHaveAttribute('data-density', 'comfortable');
});

test('H2 rejects a racing external revision instead of silently overwriting it', async ({ page }) => {
  await page.goto(route);
  await expect(page.locator('[data-prism-home]')).toHaveAttribute('data-prism-storage', 'indexeddb');
  await expect(page.locator('[data-prism-home]')).toHaveAttribute('data-prism-migration', 'persisted');
  const external = await page.evaluate(async ({ dbName, storeName, guestKey }) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(dbName);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return await new Promise<{ revision: number; mode: string }>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const objectStore = tx.objectStore(storeName);
      const req = objectStore.get(guestKey);
      let nextRevision = 0;
      req.onsuccess = () => {
        const record = req.result;
        const document = JSON.parse(record.raw);
        document.appearance.mode = 'dark';
        nextRevision = record.revision + 1;
        objectStore.put({
          ...record,
          revision: nextRevision,
          raw: JSON.stringify(document),
          pending: [...record.pending, { fromRevision: record.revision, toRevision: nextRevision, savedAt: Date.now(), coalesced: false }],
        });
      };
      tx.oncomplete = () => { db.close(); resolve({ revision: nextRevision, mode: 'dark' }); };
      tx.onerror = () => reject(tx.error);
    });
  }, { dbName, storeName, guestKey });
  expect(external.revision).toBeGreaterThan(1);
  await page.locator('.prism-topbar__customize').click();
  await page.locator('[data-prism-theme-open]').click();
  await page.locator('[data-prism-appearance="density"]').selectOption('compact');
  await expect(page.locator('[data-prism-home]')).toHaveAttribute('data-density', 'balanced');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});
