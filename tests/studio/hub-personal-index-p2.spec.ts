import {test,expect} from '@playwright/test';
for(const width of [320,390,768,1440]){
test(`PI-04 P2 native Today lead at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto('/');
 await expect(page.locator('[data-workspace-status]')).toContainText('saved locally');
 const lead=page.locator('[data-personal-index-lead]');
 await expect(lead).toBeVisible();
 await expect(lead.locator('[data-today-next]')).toContainText('Suggested focus');
 await expect(lead.locator('[data-today-agenda]')).toContainText('Calendar today');
 await expect(lead.locator('[data-today-agenda]')).toContainText('Hub events');
 await expect(lead).toContainText('not');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
});
}
test('P2 focus suggestion opens the original Hub task without persisting selection',async({page})=>{
 await page.goto('/home/tasks/');
 await expect(page.locator('[data-workspace-status]')).toContainText('saved locally');
 await page.locator('[data-action=new-task]:visible').first().click();
 await page.getByLabel('Task',{exact:true}).fill('Original P2 action');
 await page.locator('[data-dialog-submit]').click();
 await page.goto('/');
 const lead=page.locator('[data-today-next]');
 await expect(lead).toContainText('Original P2 action');
 await lead.getByRole('button',{name:'Begin focus'}).click();
 await expect(page.locator('[data-focus-panel]')).toBeVisible();
 await page.goto('/');
 await expect(lead).toContainText('Original P2 action');
 await expect(page.locator('.ws-unified-task-body')).toContainText('Original P2 action');
});
