import {test,expect,type Page} from '@playwright/test';
test.use({serviceWorkers:'block'});
async function addTask(page:Page,title:string){
  await page.locator('[data-action=new-task]').first().click();
  await page.getByLabel('Task',{exact:true}).fill(title);
  await page.getByLabel('Due date',{exact:true}).fill('');
  await page.locator('[data-dialog-submit]').click();
  await expect(page.locator('[data-workspace-dialog]')).not.toBeVisible();
  await expect(page.locator('[data-workspace-status]')).toContainText('saved locally');
}
test('mobile original task → session scratch → reviewed Hub note → next plan; no automatic progress',async({page})=>{
  test.setTimeout(90_000);
  await page.setViewportSize({width:390,height:844});
  await page.goto('/home/tasks/?filter=all');
  await expect(page.locator('[data-workspace-status]')).toContainText('saved locally');
  await addTask(page,'Differential Equations exam');
  await addTask(page,'Study Stochastics chapter');
  await page.goto('/');
  await expect(page.locator('[data-unified-today]')).toBeVisible();
  const first=page.locator('[data-unified-today] .ws-unified-task')
    .filter({hasText:'Differential Equations exam'});
  await first.locator('[data-action=unified-focus-task]').click();
  await expect(page.locator('[data-focus-panel]')).toBeVisible();
  await expect(page.locator('[data-focus-work]')).toHaveAttribute('data-source-task',/.+/);
  const notes=page.locator('[data-focus-work-field=observations]');
  await notes.fill('Studied linear equations and wrote the proof');
  await page.locator('[data-focus-work-field=blocker]').fill('Check the uniqueness theorem');
  await page.locator('[data-focus-work-field=nextStep]').fill('Solve exercise sheet 3');
  await expect(page.locator('[data-action=focus-work-note]')).toBeEnabled();

  // Changing task keeps each draft associated with the original Hub task ID.
  await page.locator('[data-action=focus-select]').filter({hasText:'Study Stochastics chapter'}).click();
  await expect(page.locator('[data-focus-work-field=observations]')).toHaveValue('');
  await page.locator('[data-focus-work-field=observations]').fill('Work on conditional expectation');
  await page.locator('[data-action=focus-select]').filter({hasText:'Differential Equations exam'}).click();
  await expect(page.locator('[data-focus-work-field=observations]'))
    .toHaveValue('Studied linear equations and wrote the proof');

  await page.locator('[data-action=focus-work-plan]').click();
  await expect(page.locator('[data-unified-review]')).toBeVisible();
  await expect(page.locator('[data-unified-review] [name=confirm]')).not.toBeChecked();
  await page.locator('[data-workspace-dialog] [data-action=close-dialog]').first().click();

  await page.locator('[data-action=focus-work-note]').click();
  await expect(page.getByLabel('Title',{exact:true}))
    .toHaveValue('Focus work · Differential Equations exam');
  await expect(page.getByLabel('Note',{exact:true})).toContainText('Check the uniqueness theorem');
  await page.locator('[data-workspace-dialog] [data-action=close-dialog]').first().click();
  await expect(page.locator('[data-focus-work-field=nextStep]'))
    .toHaveValue('Solve exercise sheet 3');

  // Saving is a distinct user action in the original Hub Notes editor.
  await page.locator('[data-action=focus-work-note]').click();
  await page.locator('[data-dialog-submit]').click();
  await expect(page.locator('[data-workspace-dialog]')).not.toBeVisible();
  await expect(page.locator('[data-workspace-status]')).toContainText('saved locally');

  await page.locator('[data-action=focus-work-clear]').click();
  await expect(page.locator('[data-workspace-dialog]')).toContainText('unsaved scratch');
  await page.locator('[data-dialog-submit]').click();
  await expect(page.locator('[data-focus-work-field=observations]')).toHaveValue('');
  await expect(page.locator('[data-action=focus-work-note]')).toBeDisabled();

  await page.goto('/');
  await page.locator('[data-action=toggle-today-more]').click();
  await expect(page.locator('[data-today-workbench]')).toContainText('Focus work · Differential Equations exam');
  await expect(page.locator('[data-unified-today]')).toContainText('Differential Equations exam');
  const width=await page.evaluate(()=>document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(390);
});
