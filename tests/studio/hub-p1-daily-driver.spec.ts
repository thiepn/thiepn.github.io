import { expect, test } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

test('desktop P1 Today prioritizes real work and preserves native planning navigation',async ({page})=>{
  await page.setViewportSize({width:1440,height:900});
  await page.goto('/');
  await expect(page.locator('[data-workspace-status]')).toContainText('saved locally');
  await expect(page.locator('[data-workspace][data-view=home]')).toBeVisible();
  await expect(page.locator('#ws-title')).toHaveText('Today');
  await expect(page.locator('[data-unified-today]')).toBeVisible();
  await expect(page.locator('[data-today-workbench]')).toBeVisible();
  await expect(page.locator('.ws-workbench-day')).toHaveCount(7);
  await expect(page.locator('[data-workbench-source-actions]')).toContainText('Hub-only view');
  await expect(page.locator('[data-today-workbench]')).toContainText('Tracker check-in');
  await expect(page.locator('[data-today-workbench]')).toContainText('Pick up a note');
  await expect(page.locator('[data-source-queue]')).toBeVisible();
  await expect(page.locator('[data-source-queue]')).toContainText('No owner summaries are available');
  await expect(page.locator('.ws-nav a[href="/"]')).toContainText('Today');
  await expect(page.locator('.ws-nav a[href="/home/calendar/"]')).toContainText('Plan');
  await page.locator('.ws-unified-head-actions [data-action=capture]').click();
  await expect(page.locator('[data-workspace-dialog]')).toBeVisible();
  await page.locator('[data-workspace-dialog] [data-action=close-dialog]').first().click();
  await page.locator('.ws-nav a[href="/home/calendar/"]').click();
  await expect(page.locator('[data-workspace][data-view=calendar]')).toBeVisible();
  await expect(page.locator('[data-planning-review]')).toBeVisible();
  await expect(page.locator('.ws-nav a[href="/home/calendar/"]')).toHaveAttribute('aria-current','page');
});

test('mobile PI-04 MENU exposes all original sections with source-safe links',async ({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  await expect(page.locator('[data-workspace-status]')).toContainText('saved locally');
  await expect(page.locator('[data-unified-today]')).toBeVisible();
  await expect(page.locator('[data-source-queue]')).toBeVisible();
  const primary=page.locator('.ws-mobile-nav');
  await expect(primary).toHaveCSS('position','static');
  await expect(primary.locator('a')).toHaveCount(0);
  await expect(primary.locator('[data-more-trigger]')).toContainText('MENU');
  await primary.locator('[data-more-trigger]').click();
  await expect(page.locator('#ws-more')).toBeVisible();
  await expect(page.locator('#ws-more a[href="/home/calendar/"]')).toContainText('Plan');
  for (const section of ['/', '/home/tasks/', '/home/trackers/', '/apps/'])
    await expect(page.locator('#ws-more a[href="'+section+'"]')).toHaveCount(1);
  await page.locator('[data-more-close]').click();
  await expect(page.locator('#ws-more')).not.toBeVisible();
  const widths=await page.evaluate(()=>({
    document:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth,
  }));
  expect(widths.document).toBeLessThanOrEqual(widths.viewport);
});


test('mobile approved Folio share appears in native seven-day Today and clears without copying',async({page,context})=>{
  test.setTimeout(60_000);
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  await expect(page.locator('[data-workbench-source-actions]')).toContainText('Hub-only view');
  await context.route('**/folio/?hubBridge=*',route=>route.fulfill({
    status:200,contentType:'text/html',body:
      '<!doctype html><html><body><button id="share">Share Folio once</button><script>'+
      'document.getElementById("share").onclick=()=>{'+
      'const nonce=new URL(location.href).searchParams.get("hubBridge");'+
      'window.opener.postMessage({type:"thiepn:folio-hub-daily:v1",nonce,'+
      'snapshot:{schema:"thiepn:folio-hub-daily",version:1,source:"folio-local-device",'+
      'generatedAt:new Date().toISOString(),date:new Date().toISOString().slice(0,10),'+
      'pendingCount:1,overdueCount:0,notes:[],habits:[],'+
      'tasks:[{id:"owner-folio-task",title:"Folio owner only",priority:"high",plannedToday:true}],'+
      'events:[]}},location.origin);};</script></body></html>'
  }));
  const opened=page.waitForEvent('popup');
  await page.locator('[data-workbench-source-actions] [data-action=connect-folio]').click();
  const popup=await opened;
  await popup.getByRole('button',{name:'Share Folio once'}).click();
  await expect(page.locator('[data-today-workbench]')).toContainText('Folio owner only');
  await expect(page.locator('[data-folio-workbench-day]')).toHaveCount(7);
  await expect(page.locator('[data-workbench-source-actions]')).toContainText('Folio shared once');
  await page.locator('[data-workbench-source-actions] [data-action=disconnect-folio]').click();
  await expect(page.locator('[data-today-workbench]')).not.toContainText('Folio owner only');
  await expect(page.locator('[data-folio-workbench-day]')).toHaveCount(0);
  await expect(page.locator('[data-workbench-source-actions]')).toContainText('Hub-only view');
  const width=await page.evaluate(()=>document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(390);
  await popup.close();
});
