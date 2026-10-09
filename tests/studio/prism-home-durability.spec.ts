import { test, expect } from '@playwright/test';

const route = '/home/prism-preview/';
const dbName = 'thiepn-hub-home-v1';
const storeName = 'home-records';
const guestKey = 'thiepn:home-document:v2';

test('H2 offline edits are durable locally and remain pending after reconnect', async ({ page, context }) => {
  await page.goto(route);
  await expect(page.locator('[data-prism-home]')).toHaveAttribute('data-prism-storage', 'indexeddb');
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
  await page.locator('.prism-topbar__customize').click();
  await page.locator('[data-prism-theme-open]').click();
  await page.locator('[data-prism-appearance="density"]').selectOption('comfortable');
  await expect(second.locator('[data-prism-home]')).toHaveAttribute('data-density', 'comfortable');
  await second.close();
});
