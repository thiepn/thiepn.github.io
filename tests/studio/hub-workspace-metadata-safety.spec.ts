import {test,expect} from '@playwright/test';
test('original decision record cannot be silently removed through Customize widget removal or starter layout',async({page})=>{
 await page.goto('/');
 await page.locator('[data-today-decisions] [data-action=new-decision]').click();
 await page.getByLabel('Decision title').fill('Keep source decision');
 await page.getByLabel('Options, one per line').fill('Continue\nChange');
 await page.locator('[data-dialog-submit]').click();
 await expect(page.locator('[data-today-decisions]')).toContainText('Keep source decision');
 await page.locator('[data-action=unified-mode][data-id=workspace]').click();
 await page.getByRole('button',{name:'Customize',exact:true}).click();
 await page.locator('[data-widget-type=decision-register] [data-action=configure-widget]').click();
 await page.locator('[data-workspace-dialog] [data-action=remove-widget]').click();
 await expect(page.locator('[data-widget-type=decision-register]')).toContainText('Keep source decision');
 await page.getByRole('button',{name:'Cancel',exact:true}).click();
 await page.reload();
 await page.goto('/');
 await expect(page.locator('[data-today-decisions]')).toContainText('Keep source decision');
});
