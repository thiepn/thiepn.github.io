import { expect, test } from '@playwright/test';
import { HUB_VISIBLE_APP_IDS } from '../../src/lib/workspace/visible-apps';
import { PROPOSED_QUICK_SHORTCUT_IDS } from '../../src/lib/workspace/app-personalization';
import manifest from '../../src/generated/launch-manifest.json' with {type:'json'};

test('Apps, search and Connections use the same owner-approved list', async ({page}) => {
  await page.goto('/apps/');
  expect(await page.locator('[data-hub-slug]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-hub-slug')))).toEqual([...HUB_VISIBLE_APP_IDS]);
  await expect(page.locator('[data-show-hidden-apps], [data-hub-current-app], [data-hub-pending-app]')).toHaveCount(0);
  await page.goto('/search/');
  expect(await page.locator('[data-portal-search-slug]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-portal-search-slug')))).toEqual([...HUB_VISIBLE_APP_IDS]);
  await page.locator('[data-portal-query]').fill('French vocabulary');
  await expect(page.locator('[data-portal-search-slug="french-3000"]')).toHaveCount(0);
  await page.goto('/home/connections/');
  const titles=HUB_VISIBLE_APP_IDS.map(id=>manifest.entries.find(e=>e.id===id)!.title);
  expect(await page.locator('.ws-connection-table tbody th').allTextContents()).toEqual(titles);
});
test('new Hub workspace uses eight approved shortcuts in order', async ({page}) => {
  await page.goto('/home/');
  await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
  expect(await page.locator('[data-launch]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-launch')))).toEqual([...PROPOSED_QUICK_SHORTCUT_IDS]);
});
test('legacy hidden shortcuts are suppressed without rewriting original preferences', async ({page}) => {
  await page.addInitScript(()=>localStorage.setItem('thiepn:hub-preferences',JSON.stringify({version:1,pins:['notes','studyos','canvas','bikes'],density:'comfortable'})));
  await page.goto('/home/');
  await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
  expect(await page.locator('[data-launch]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-launch')))).toEqual(['notes','canvas']);
  await page.reload();
  await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
  expect(JSON.parse(await page.evaluate(()=>localStorage.getItem('thiepn:hub-preferences')!)).pins).toEqual(['notes','studyos','canvas','bikes']);
  await page.goto('/apps/');
  await page.getByRole('button',{name:'Use my selected 8 shortcuts'}).click();
  await page.goto('/home/');
  expect(await page.locator('[data-launch]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-launch')))).toEqual([...PROPOSED_QUICK_SHORTCUT_IDS]);
});
