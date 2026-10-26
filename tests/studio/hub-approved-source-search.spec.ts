import { test, expect } from '@playwright/test';
test.use({ serviceWorkers: 'block' });
test('consented Notes titles become searchable without storing private source data', async ({page,context}) => {
  await page.setViewportSize({width:390,height:844});
  await context.route('**/notes/?hubNotes=*',route=>route.fulfill({
    status:200,contentType:'text/html',body:"<!doctype html><html><body><button id=\"share\">Share Notes once</button><script>\ndocument.getElementById('share').addEventListener('click', () => {\nconst nonce = new URL(location.href).searchParams.get('hubNotes');\nwindow.opener.postMessage({\ntype:'thiepn:notes-hub-local:v1',nonce,\nsnapshot:{schema:'thiepn:notes-hub-local',version:1,source:'notes-local-device',\ngeneratedAt:new Date().toISOString(),activeCount:1,\nnotes:[{id:'n',title:'<Lecture> outline',updatedAt:new Date().toISOString(),pinned:true}],\nreminders:[{id:'r',noteId:'n',title:'Review chapter',dueAt:new Date().toISOString()}]}\n},location.origin);\n});\n</script></body></html>"
  }));
  await page.goto('/home/legacy/');
 await expect(page.locator('[data-source-today-notes]')).toBeVisible();
  await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
  await page.locator('[data-action=unified-mode][data-id=today]').click();
  await page.locator('[data-action=search]').click();
  await page.locator('#workspace-search').fill('~lecture');
  await expect(page.locator('[data-search-results]')).not.toContainText('Notes approved title');
  await page.locator('[data-action=close-search]').click();
  const opening = page.waitForEvent('popup');
  await page.locator('[data-source-today-notes] [data-action=connect-notes-source]').click();
  const popup = await opening;
  await popup.getByRole('button',{name:'Share Notes once'}).click();
  await expect(page.locator('[data-source-today-notes]')).toContainText('<Lecture> outline');
  await page.locator('[data-action=search]').click();
  await page.locator('#workspace-search').fill('~lecture');
  await expect(page.locator('[data-search-results]')).toContainText('Notes approved title');
  await expect(page.locator('[data-search-results]')).toContainText('<Lecture> outline');
  await expect(page.locator('[data-search-results] a[href="/notes/"]')).toHaveCount(1);
  expect(await page.locator('[data-search-results]').evaluate(el=>el.querySelectorAll('lecture').length)).toBe(0);
  await page.locator('[data-action=close-search]').click();
  await page.locator('[data-source-today-notes] [data-action=clear-notes-source]').click();
  await page.locator('[data-action=search]').click();
  await page.locator('#workspace-search').fill('~lecture');
  await expect(page.locator('[data-search-results]')).not.toContainText('Notes approved title');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await popup.close();
});
