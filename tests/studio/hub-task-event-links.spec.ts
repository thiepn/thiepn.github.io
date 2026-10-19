import {test,expect} from '@playwright/test';
test('desktop source task and event link through original review, persist and unlink',async({page})=>{
 await page.goto('/?mode=workspace');
 await page.locator('[data-action=new-task]').first().click();
 await page.getByLabel('Task',{exact:true}).fill('Original study task');
 await page.locator('[data-dialog-submit]').click();
 await page.locator('[data-action=new-event]').first().click();
 await page.getByLabel('Event',{exact:true}).fill('Original study block');
 await page.locator('[data-dialog-submit]').click();
 await page.locator('[data-action=unified-mode][data-id=today]').click();
 await page.locator('[data-today-task-event] [data-action=review-task-event-link]').click();
 await page.getByLabel('Original Hub task',{exact:true}).selectOption({label:'Original study task'});
 await page.getByLabel('Original Hub calendar event').selectOption({index:0});
 await page.getByLabel('Relationship').selectOption('work');
 await page.locator('[data-dialog-submit]').click();
 await expect(page.locator('[data-today-task-event]')).toContainText('Original study task');
 await page.reload();
 await expect(page.locator('[data-today-task-event]')).toContainText('Original study block');
 await page.locator('[data-today-task-event] [data-action=unlink-task-event]').click();
 await page.locator('[data-dialog-submit]').click();
 await expect(page.locator('[data-today-task-event]')).toContainText('No confirmed task');
 await page.goto('/home/tasks/?filter=all');
 await expect(page.locator('.ws-task-results .ws-task-entry').filter({hasText:'Original study task'})).toHaveCount(1);
});
test('mobile Today explicit Hub relation does not overflow layout',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/home/tasks/?filter=all');
 // A real relation requires both original Hub records. An empty source set
 // deliberately does not offer a writable task/event selector.
 await page.locator('[data-action=new-task]:visible').first().click();
 await page.getByLabel('Task',{exact:true}).fill('Mobile original task');
 await page.locator('[data-dialog-submit]').click();
 await expect(page.locator('[data-workspace-dialog]')).not.toBeVisible();
 await page.goto('/home/calendar/');
 await page.locator('[data-action=new-event]:visible').first().click();
 await page.getByLabel('Event',{exact:true}).fill('Mobile original event');
 await page.locator('[data-dialog-submit]').click();
 await expect(page.locator('[data-workspace-dialog]')).not.toBeVisible();
 await page.goto('/');
 await expect(page.locator('[data-today-task-event]')).toBeVisible();
 await page.locator('[data-today-task-event] [data-action=review-task-event-link]').click();
 await expect(page.getByLabel('Original Hub task',{exact:true})).toBeVisible();
 await page.locator('[data-workspace-dialog] [data-action=close-dialog]:visible').first().click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
