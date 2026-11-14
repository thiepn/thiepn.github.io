import { expect, test } from '@playwright/test';

test('personal Apps hides are reversible and account-owned without deleting public links', async ({page}) => {
  await page.goto('/apps/');
  await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
  await expect(page.locator('[data-hub-item]')).toHaveCount(31);
  const control=page.locator('[data-hub-current-app="control"]');
  const ligo=page.locator('[data-hub-current-app="ligoquiz"]');
  await expect(control).toBeHidden();
  await expect(ligo).toBeHidden();
  await page.locator('[data-show-hidden-apps]').check();
  await expect(control).toBeVisible();
  await expect(ligo).toBeVisible();
  await control.locator('[data-action="toggle-app-visibility"]').click();
  await expect(control.locator('[data-action="toggle-app-visibility"]')).toHaveText('Hide');
  await page.locator('[data-show-hidden-apps]').uncheck();
  await expect(control).toBeVisible();
  await expect(ligo).toBeHidden();
  await page.reload();
  await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
  await expect(page.locator('[data-hub-current-app="control"]')).toBeVisible();
  await expect(page.locator('[data-hub-current-app="ligoquiz"]')).toBeHidden();
  // Canonical shortcut link is still in the public HTML, only the personal UI filters it.
  await expect(page.locator('[data-hub-current-app="control"] a')).toHaveAttribute('href', 'https://control.thiepn.dev/');
});

test('new Hub workspace uses selected eight in order and candidate Clearpage stays shortcut-only', async ({page}) => {
  await page.goto('/home/');
  await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
  const links=page.locator('[data-launch]');
  await expect(links).toHaveCount(8);
  expect(await links.evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-launch')))).toEqual([
    'studyos','mdd','pdf-studio','thiepn-library','notes','tms60','tiny-tools','clearpage'
  ]);
  await page.goto('/apps/');
  await expect(page.locator('[data-hub-current-app="clearpage"] a')).toHaveAttribute('href','https://page.thiepn.dev/');
  await expect(page.locator('[data-hub-pending-app]')).toHaveCount(4);
  await expect(page.locator('[data-hub-pending-app] a')).toHaveCount(0);
  await expect(page.locator('[data-hub-item]')).toHaveCount(31);
});

test('imported legacy shortcuts survive until explicit owner action',async({page})=>{
  await page.addInitScript(()=>{
    localStorage.setItem('thiepn:hub-preferences',JSON.stringify({
      version:1,pins:['notes','canvas'],density:'comfortable'
    }));
  });
  await page.goto('/home/');
  await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
  expect(await page.locator('[data-launch]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-launch')))).toEqual(['notes','canvas']);
  await page.goto('/apps/');
  await page.getByRole('button',{name:'Use my selected 8 shortcuts'}).click();
  await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
  await page.goto('/home/');
  expect(await page.locator('[data-launch]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-launch')))).toEqual([
    'studyos','mdd','pdf-studio','thiepn-library','notes','tms60','tiny-tools','clearpage'
  ]);
  expect(JSON.parse(await page.evaluate(()=>localStorage.getItem('thiepn:hub-preferences')!)).pins).toEqual(['notes','canvas']);
});
