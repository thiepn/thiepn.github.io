import {test,expect} from '@playwright/test';
test.use({serviceWorkers:'block'});
test('Phase 03 Today renders seven original Hub days, tracker and note handoffs',async({page})=>{
 await page.goto('/');
 await expect(page.locator('[data-workspace-status]')).toContainText('saved locally');
 await expect(page.locator('[data-workspace][data-home-mode=today]')).toBeVisible();
 await expect(page.locator('[data-today-workbench]')).toBeVisible();
 await expect(page.locator('.ws-workbench-day')).toHaveCount(7);
 await expect(page.locator('[data-today-workbench]')).toContainText('Tracker check-in');
 await expect(page.locator('[data-today-workbench]')).toContainText('Pick up a note');
 await expect(page.locator('[data-workbench-source-actions]')).toContainText('Hub-only view');
 await expect(page.locator('[data-today-workbench] a[href^="/home/calendar/?date="]')).toHaveCount(7);
 await expect(page.locator('[data-today-workbench]')).not.toContainText('Folio shared once');
});
test('Phase 03 mobile source view stays bounded and original Workspace remains editable',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/');
 await expect(page.locator('[data-today-workbench]')).toBeVisible();
 await expect(page.locator('[data-source-queue]')).toBeVisible();
 await expect(page.locator('.ws-workbench-day')).toHaveCount(7);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
 await page.locator('[data-action=unified-mode][data-id=workspace]').click();
 await expect(page.locator('[data-workspace][data-home-mode=workspace]')).toBeVisible();
 await expect(page.locator('[data-grid]')).toBeVisible();
});
test('Phase 03 privacy hides native Today records without spawning a new data owner',async({page})=>{
 await page.goto('/');
 await expect(page.locator('[data-today-workbench]')).toBeVisible();
 await page.locator('.ws-topbar [data-action=account]').click();
 await expect(page.locator('[data-account-dialog]')).toBeVisible();
 await page.locator('[data-account-dialog] [data-connection-privacy]').click();
 await expect(page.locator('[data-today-workbench]')).toHaveCount(0);
 await expect(page.locator('[data-workspace]')).toHaveAttribute('data-calendar-private','true');
});
