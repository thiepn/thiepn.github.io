import { test, expect } from '@playwright/test';
test.use({ serviceWorkers: 'block' });
test('Phase 02 Today defaults to genuine daily view and existing Focus/Workspace remain',async({page})=>{
 await page.goto('/');
 await expect(page.locator('[data-workspace][data-home-mode="today"]')).toBeVisible();
 await expect(page.locator('#ws-title')).toHaveText('Today');
 await expect(page.locator('[data-source-queue], [data-source-today-folio], [data-source-today-notes]')).toHaveCount(0);
 await expect(page.locator('.ws-nav a[href="/"]')).toContainText('Today');
 await page.locator('[data-action="unified-mode"][data-id="focus"]').click();
 await expect(page.locator('[data-workspace][data-home-mode="focus"]')).toBeVisible();
 await page.locator('[data-action="unified-mode"][data-id="workspace"]').click();
 await expect(page.locator('[data-workspace][data-home-mode="workspace"]')).toBeVisible();
 await page.goto('/home/legacy/');
 await expect(page.locator('[data-hub-legacy-recovery]')).toBeVisible();
 await expect(page.locator('[data-source-today-folio]')).toBeVisible();
});
test('Phase 02 mobile keeps Today, Apps, Tasks and original Plan/Documents routes',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/');
 await expect(page.locator('.ws-mobile-nav a[href="/"]')).toContainText('Today');
 await expect(page.locator('.ws-mobile-nav a[href="/apps/"]')).toContainText('Apps');
 await expect(page.locator('.ws-mobile-nav a[href="/home/tasks/"]')).toContainText('Tasks');
 await page.locator('[data-more-trigger]').click();
 await expect(page.locator('#ws-more a[href="/home/calendar/"]')).toContainText('Plan');
 await expect(page.locator('#ws-more a[href="/home/documents/"]')).toContainText('Documents');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
test('Phase 02 calendar exposes reviewed distribution and original weekly carryover',async({page})=>{
 await page.goto('/home/calendar/?mode=week');
 await expect(page.locator('[data-planning-review]')).toBeVisible();
 await expect(page.locator('[data-action="week-preview"].ws-week-primary')).toBeVisible();
 await expect(page.locator('[data-action="week-spread"]')).toBeVisible();
});
