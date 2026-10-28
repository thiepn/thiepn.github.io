import {test,expect} from '@playwright/test';
test('mobile Today outcome creates and survives reload; archive restores in Workspace',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');
 await page.locator('[data-action=toggle-today-more]').click();
 await page.locator('[data-today-outcomes] [data-action=new-outcome]').click();
 await page.getByLabel('Outcome title').fill('Semester completion');
 await page.getByLabel('Target date').fill('2026-10-25');
 await page.locator('[data-dialog-submit]').click();
 await expect(page.locator('[data-today-outcomes]')).toContainText('Semester completion');
 await page.reload();await page.locator('[data-action=toggle-today-more]').click();await expect(page.locator('[data-today-outcomes]')).toContainText('Semester completion');
 await page.locator('[data-today-outcomes] [data-action=toggle-outcome]').click();
 await expect(page.locator('[data-today-outcomes]')).toContainText('No active outcomes');
 await page.locator('[data-action=unified-mode][data-id=workspace]').click();
 const board=page.locator('[data-widget-type=outcome-board]');await board.locator('summary').click();
 await board.locator('[data-action=toggle-outcome]').click();
 await expect(board).toContainText('Semester completion');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
