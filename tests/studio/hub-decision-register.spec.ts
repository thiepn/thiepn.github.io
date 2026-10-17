import {test,expect} from '@playwright/test';
test('mobile Today decision register saves options, decides and reopens without shadow tasks',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');
 await page.locator('[data-today-decisions] [data-action=new-decision]').click();
 await page.getByLabel('Decision title').fill('Which research direction?');
 await page.getByLabel('Options, one per line').fill('Statistics\nAI');
 await page.getByLabel('Review date').fill('2026-10-25');
 await page.locator('[data-dialog-submit]').click();
 await expect(page.locator('[data-today-decisions]')).toContainText('Which research direction?');
 await page.reload();
 await page.locator('[data-today-decisions] [data-action=choose-decision]').click();
 await page.getByLabel('Selected option').selectOption('AI');
 await page.getByLabel('Why this option?').fill('More relevant for research');
 await page.locator('[data-dialog-submit]').click();
 await expect(page.locator('[data-today-decisions]')).toContainText('Selected: AI');
 await page.locator('[data-today-decisions] [data-action=reopen-decision]').click();
 // The existing source-safe workflow requires explicit confirmation: its original
 // decision choice and rationale are not silently discarded by the first click.
 await expect(page.locator('[data-workspace-dialog]')).toContainText('Clear the current choice');
 await page.locator('[data-dialog-submit]').click();
 await expect(page.locator('[data-workspace-dialog]')).not.toBeVisible();
 await expect(page.locator('[data-today-decisions]')).toContainText('2 options to consider');
 await page.locator('[data-action=unified-mode][data-id=workspace]').click();
 await expect(page.locator('[data-widget-type=decision-register]')).toContainText('Which research direction?');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
test('desktop original task and note sources remain accessible after decision save',async({page})=>{
 await page.goto('/?mode=workspace');
 await page.locator('[data-action=new-task]').first().click();
 await page.getByLabel('Task',{exact:true}).fill('Original task for decision');
 await page.locator('[data-dialog-submit]').click();
 await page.locator('[data-action=unified-mode][data-id=today]').click();
 await page.locator('[data-today-decisions] [data-action=new-decision]').click();
 await page.getByLabel('Decision title').fill('Training choice');
 await page.getByLabel('Options, one per line').fill('Course A\nCourse B');
 await page.getByLabel('Related original task').selectOption({label:'Original task for decision'});
 await page.locator('[data-dialog-submit]').click();
 await page.locator('[data-action=unified-mode][data-id=workspace]').click();
 const board=page.locator('[data-widget-type=decision-register]');
 await expect(board).toContainText('Training choice');
 await board.locator('[data-action=context-task]').click();
 await expect(page.locator('[data-workspace-dialog]')).toBeVisible();
 await expect(page.locator('[data-workspace-dialog]')).toContainText('Original task for decision');
});
