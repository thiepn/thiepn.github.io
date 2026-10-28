import {test,expect} from '@playwright/test';
test.use({serviceWorkers:'block'});
test('mobile pin original task and note, continue from Today, unpin without touching source data',async({page})=>{
 test.setTimeout(90_000);
 await page.setViewportSize({width:390,height:844});
 await page.goto('/home/tasks/?filter=all');
 await expect(page.locator('[data-workspace-status]')).toContainText('saved locally');
 await page.locator('[data-action=new-task]').first().click();
 await page.getByLabel('Task',{exact:true}).fill('Pinned DGL course review');
 await page.getByLabel('Due date',{exact:true}).fill('');
 await page.locator('[data-dialog-submit]').click();
 await expect(page.locator('[data-workspace-dialog]')).not.toBeVisible();
 const task=page.locator('.ws-task-results .ws-task-entry').filter({hasText:'Pinned DGL course review'});
 await expect(task).toHaveCount(1);
 await task.locator('[data-action=context-task]').first().click();
 await expect(page.locator('[data-workspace-dialog]')).toBeVisible();
 await page.locator('[data-workspace-dialog] [data-action=toggle-record-pin]').click();
 await page.locator('[data-workspace-dialog] [data-action=close-dialog]').first().click();

 // An original note remains a separate record, not a copy inside the pinboard.
 await task.locator('[data-action=context-task]').first().click();
 await page.locator('[data-workspace-dialog] [data-action=create-note-from-task]').click();
 await page.getByLabel('Title',{exact:true}).fill('Pinned DGL lecture notes');
 await page.locator('[data-dialog-submit]').click();
 await expect(page.locator('[data-workspace-dialog]')).not.toBeVisible();
 await page.goto('/');
 await page.locator('[data-action=toggle-today-more]').click();
 await page.locator('[data-action=unified-mode][data-id=today]').click();
 const pinboard=page.locator('[data-today-pinboard]');
 await expect(pinboard).toContainText('Pinned DGL course review');
 await expect(pinboard.locator('[data-record-pin]')).toHaveCount(1);
 await page.locator('[data-today-workbench] [data-action=context-note]').first().click();
 await expect(page.locator('[data-workspace-dialog]')).toContainText('Pinned DGL lecture notes');
 await page.locator('[data-workspace-dialog] [data-action=toggle-record-pin]').click();
 await page.locator('[data-workspace-dialog] [data-action=close-dialog]').first().click();
 await expect(pinboard.locator('[data-record-pin]')).toHaveCount(2);
 await pinboard.locator('[data-action=move-record-pin-up]').first().click();
 await expect(pinboard.locator('[data-record-pin]').first()).toContainText('Pinned DGL lecture notes');
 await pinboard.locator('[data-action=toggle-record-pin]').first().click();
 await expect(pinboard.locator('[data-record-pin]')).toHaveCount(1);
 await expect(pinboard).toContainText('Pinned DGL course review');

 // Workspace widget uses exact same original reference list, with no shadow copy.
 await page.locator('[data-action=unified-mode][data-id=workspace]').click();
 await expect(page.locator('[data-widget-type=record-pinboard]')).toBeVisible();
 await expect(page.locator('[data-widget-type=record-pinboard]')).toContainText('Pinned DGL course review');
 await page.goto('/home/tasks/?filter=all');
 await expect(page.locator('.ws-task-results .ws-task-entry').filter({hasText:'Pinned DGL course review'})).toHaveCount(1);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
