import {test,expect} from '@playwright/test';

for(const width of [1440,390]){
 test('Hub native knowledge editor, backlinks, reload and same-shell navigation '+width, async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width,height:width===390?844:900});
  await page.goto('/home/knowledge/');
  await expect(page.locator('[data-workspace-status]')).toContainText('saved locally');
  await expect(page.locator('[data-workspace]')).toHaveAttribute('data-view','knowledge');
  await page.locator('[data-action=knowledge-new]').click();
  await page.locator('[data-knowledge-form] [name=title]').fill('University index');
  await page.locator('[data-knowledge-form] [name=body]').fill('Lecture material and [[Second note]]');
  await page.locator('[data-knowledge-form] [type=submit]').click();
  await expect(page.locator('[data-knowledge-list]')).toContainText('University index');
  await page.locator('[data-action=knowledge-new]').click();
  await page.locator('[data-knowledge-form] [name=title]').fill('Second note');
  await page.locator('[data-knowledge-form] [name=body]').fill('Original theorem and proof');
  await page.locator('[data-knowledge-form] [type=submit]').click();
  await expect(page.locator('.ws-knowledge-relations')).toContainText('University index');
  await page.reload();
  await expect(page.locator('[data-knowledge-list]')).toContainText('Second note');
  await expect(page.locator('[data-knowledge-list]')).toContainText('University index');
  await page.locator('[data-action=knowledge-open]').filter({hasText:'University index'}).first().click();
  await expect(page.locator('.ws-knowledge-relations')).toContainText('Second note');
  await expect(page.locator('[data-workspace-status]')).toContainText('saved locally');
  expect(errors).toEqual([]);
 });
}

test('Hub knowledge unsaved draft cannot silently disappear through internal navigation',async({page})=>{
 await page.goto('/home/knowledge/');
 await expect(page.locator('[data-workspace-status]')).toContainText('saved locally');
 await page.locator('[data-action=knowledge-new]').click();
 await page.locator('[data-knowledge-form] [name=title]').fill('Unsaved study');
 page.once('dialog',dialog=>dialog.dismiss());
 await page.locator('.ws-nav a[href="/home/tasks/"]').click();
 await expect(page.locator('[data-workspace]')).toHaveAttribute('data-view','knowledge');
 await expect(page.locator('[data-knowledge-form] [name=title]')).toHaveValue('Unsaved study');
});

for(const width of [1440,390]){
 test('native KEEP-derived project tasks remain in original Hub note '+width,async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width,height:width===390?844:900});
  await page.goto('/home/knowledge/');
  await expect(page.locator('[data-workspace-status]')).toContainText('saved locally');
  await page.locator('[data-action=knowledge-new-project]').click();
  await page.locator('[data-knowledge-form] [name=title]').fill('Research project');
  await page.locator('[data-knowledge-form] [type=submit]').click();
  await expect(page.locator('.ws-knowledge-projects')).toContainText('Research project');
  await expect(page.locator('.ws-knowledge-relations')).toContainText('0%');
  await page.locator('[data-action=knowledge-toggle-task]').click();
  await expect(page.locator('.ws-knowledge-relations')).toContainText('100%');
  await page.reload();
  await page.locator('[data-action=knowledge-open]').filter({hasText:'Research project'}).first().click();
  await expect(page.locator('.ws-knowledge-relations')).toContainText('100%');
  await expect(page.locator('[data-knowledge-form] [name=body]')).toContainValue('- [x] First step');
  expect(errors).toEqual([]);
 });
}
