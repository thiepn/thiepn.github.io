import {test,expect} from '@playwright/test';
test.use({serviceWorkers:'block'});
test('P3 edits the same original note and preserves it across reload',async({page})=>{
 await page.goto('/home/?mode=workspace');
 await expect(page.locator('[data-workspace-status]')).toContainText('saved locally');
 await expect(page.locator('[data-hub-knowledge]')).toBeVisible();
 await page.locator('[data-hub-knowledge] [data-action=edit-note]').first().click();
 await page.getByLabel('Title',{exact:true}).fill('Knowledge original');
 await page.getByLabel('Note',{exact:true}).fill('Long native note\n'+('Readable text\n'.repeat(150)));
 await page.locator('[data-dialog-submit]').click();
 await expect(page.locator('[data-knowledge-original]')).toContainText('Readable text');
 const original=await page.locator('[data-knowledge-original]').getAttribute('data-knowledge-original');
 await page.locator('[data-knowledge-query]').fill('Readable text');
 await expect(page.locator('.ws-knowledge-items .ws-knowledge-item')).toHaveCount(1);
 await page.locator('[data-knowledge-original] [data-action=edit-note]').click();
 await expect(page.getByLabel('Note',{exact:true})).toHaveValue(/Readable text/);
 await page.getByLabel('Note',{exact:true}).fill('Changed in original note editor');
 await page.locator('[data-dialog-submit]').click();
 await expect(page.locator('[data-knowledge-original]')).toHaveAttribute('data-knowledge-original',original!);
 await page.reload();
 await expect(page.locator('[data-hub-knowledge]')).toContainText('Changed in original note editor');
});
for(const width of [320,390,768,1440]){
 test('P3 Knowledge reflow '+width,async({page})=>{
  await page.setViewportSize({width,height:900});await page.goto('/home/?mode=workspace');
  await expect(page.locator('[data-hub-knowledge]')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
 });
}
test('P3 masking removes original note text from Knowledge DOM',async({page})=>{
 await page.goto('/home/?mode=workspace');
 await page.locator('[data-hub-knowledge] [data-action=edit-note]').first().click();
 await page.getByLabel('Title',{exact:true}).fill('Private original');
 await page.getByLabel('Note',{exact:true}).fill('Private note text');
 await page.locator('[data-dialog-submit]').click();
 await page.getByRole('button',{name:'Hide personal content',exact:true}).click();
 await expect(page.locator('[data-hub-knowledge]')).toHaveCount(0);
 await expect(page.locator('[data-workspace-content]')).not.toContainText('Private note text');
});
