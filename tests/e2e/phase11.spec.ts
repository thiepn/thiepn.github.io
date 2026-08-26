import { expect, test } from '@playwright/test';

test('search index is lazy and loads only when Project Search opens', async ({ page }) => {
  const searchRequests: string[] = [];
  page.on('request', (request) => { if (request.url().endsWith('/search-index.json')) searchRequests.push(request.url()); });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect(searchRequests).toHaveLength(0);
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+K' : 'Control+K');
  await expect(page.locator('[data-catalogue-search-dialog]')).toBeVisible();
  await expect.poll(() => searchRequests.length).toBe(1);
});

test('project list DOM is materialized only on demand', async ({ page, request }) => {
  const catalogueResponse = await request.get('/catalogue.json');
  expect(catalogueResponse.ok()).toBeTruthy();
  const catalogue = await catalogueResponse.json();
  const expectedProjectCount = catalogue.projects.length;

  await page.goto('/projects/');
  await expect(page.locator('[data-archive-list] [data-archive-item]')).toHaveCount(0);
  const listButton = page.locator('[data-archive-view="list"]');
  await expect(listButton).toBeVisible();
  await listButton.click();
  await expect(page.locator('[data-archive-list] [data-archive-item]')).toHaveCount(expectedProjectCount);
});

test('250-project harness remains contained and has no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/dev/scale/');
  await expect(page.locator('[data-scale-card]')).toHaveCount(250);
  await page.getByRole('button',{name:'Games',exact:true}).click();
  await expect(page.locator('[data-archive-result-count]')).toHaveText('42');
  await page.getByRole('button',{name:'All',exact:true}).click();
  await page.getByRole('button',{name:'List',exact:true}).click();
  await expect(page.locator('[data-archive-list] [data-archive-item]')).toHaveCount(250);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  const contentVisibility = await page.locator('[data-scale-card]').nth(100).evaluate((node) => getComputedStyle(node).contentVisibility);
  expect(['auto', 'visible']).toContain(contentVisibility);
});

test('performance diagnostics remain opt-in', async ({ page }) => {
  await page.goto('/?debug=perf');
  await page.waitForLoadState('load');
  await expect.poll(async () => await page.evaluate(() => document.documentElement.dataset.perfDebug)).toBe('true');
  const snapshot = await page.evaluate(() => (window as Window & { __THIEPN_PERF__?: unknown }).__THIEPN_PERF__);
  expect(snapshot).toBeTruthy();
});
