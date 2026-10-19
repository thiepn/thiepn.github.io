import {test,expect} from '@playwright/test';
test.use({serviceWorkers:'block'});

test('original task → working note → contextual task continuity on desktop and mobile',async({page})=>{
  test.setTimeout(60_000);
  await page.setViewportSize({width:390,height:844});
  await page.goto('/home/tasks/?filter=all');
  await expect(page.locator('[data-workspace-status]')).toContainText('saved locally');
  await page.locator('[data-action=new-task]').first().click();
  await page.getByLabel('Task',{exact:true}).fill('Differential Equations exam');
  await page.getByLabel('Due date',{exact:true}).fill('');
  await page.locator('[data-dialog-submit]').click();
  await expect(page.locator('[data-workspace-dialog]')).not.toBeVisible();

  const original=page.locator('.ws-task-results .ws-task-entry').filter({hasText:'Differential Equations exam'});
  await expect(original).toHaveCount(1);
  await original.locator('[data-action=context-task]').first().click();
  await expect(page.locator('[data-task-knowledge-context]')).toBeVisible();
  await expect(page.locator('[data-task-knowledge-context]')).toContainText('Work from existing knowledge');
  await page.locator('[data-workspace-dialog] [data-action=create-note-from-task]').click();
  await expect(page.locator('[data-workspace-dialog]')).toBeVisible();
  await expect(page.getByLabel('Title',{exact:true})).toHaveValue('Differential Equations exam');
  await page.getByLabel('Note',{exact:true}).fill('Linear differential equation lecture summary');
  await page.locator('[data-dialog-submit]').click();
  await expect(page.locator('[data-workspace-dialog]')).not.toBeVisible();
  await expect(page.locator('[data-workspace-status]')).toContainText('saved locally');

  // Original task still exists; the new note is an explicitly reviewed Hub note,
  // not a StudyOS/KEEP record or silently persisted task-note relationship.
  await original.locator('[data-action=context-task]').first().click();
  const context=page.locator('[data-task-knowledge-context]');
  await expect(context).toContainText('Differential Equations exam');
  await context.locator('[data-action=edit-note]').first().click();
  await expect(page.getByLabel('Title',{exact:true})).toHaveValue('Differential Equations exam');
  await page.locator('[data-workspace-dialog] [data-action=close-dialog]').first().click();

  await page.goto('/');
  await expect(page.locator('[data-today-workbench]')).toBeVisible();
  const notes=page.locator('[data-today-workbench] [data-action=context-note]');
  await expect(notes.first()).toBeVisible();
  await notes.first().click();
  await expect(page.locator('[data-note-work-context]')).toBeVisible();
  await expect(page.locator('[data-note-work-context]')).toContainText('Differential Equations exam');
  await expect(page.locator('[data-note-work-context] [data-action=context-task]')).toHaveCount(1);
  const width=await page.evaluate(()=>document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(390);
});
